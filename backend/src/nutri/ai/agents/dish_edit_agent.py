"""
DishEditAgent — Stateless agent for swapping/adding a single dish in a meal plan draft.

This agent is purpose-built for the interactive menu editor UI. It takes a user's
custom prompt (e.g. "Đổi thành cá kho") along with the current menu context to
generate exactly ONE new dish that fits the meal slot.

Usage:
    agent = DishEditAgent()
    result = await agent.generate_dish(
        action="swap",
        meal_type="lunch",
        custom_prompt="Đổi thành cá kho",
        profile_context="...",
        current_menu_context="Sáng: Phở gà, Trưa: Thịt kho tàu",
        original_dish_name="Thịt kho tàu",
    )
"""

import asyncio
import logging
from typing import Literal, Optional

from langchain_core.exceptions import OutputParserException
from langchain_core.messages import HumanMessage, SystemMessage
from nutri.ai.agents.meal_plan_agent import GeneratedMealData
from nutri.ai.language import detect_user_language
from nutri.ai.llm_client import get_llm
from nutri.ai.system_prompt import SystemPrompt

logger = logging.getLogger("nutri.ai.agents.dish_edit")


# -----------
# Retry logic
# -----------


def _is_transient_error(err: Exception) -> bool:
    text = str(err).lower()
    transient_markers = (
        "internal_failure",
        "status: 500",
        "http 500",
        "service unavailable",
        "temporarily unavailable",
        "deadline exceeded",
        "rate limit",
        "429",
        "406",
        "nonetype",
        "not iterable",
        "validation error",
        "validationerror",
    )
    return any(marker in text for marker in transient_markers)


async def _invoke_with_retries(
    llm,
    messages: list,
    fallback_messages: list | None = None,
    max_retries: int = 3,
    label: str = "DishEdit",
):
    """Retry wrapper for structured-output LLM calls."""
    last_error = None
    for attempt in range(max_retries + 1):
        try:
            invoke_msgs = (
                messages
                if (attempt == 0 or not fallback_messages)
                else fallback_messages
            )
            return await llm.ainvoke(invoke_msgs)
        except OutputParserException as e:
            last_error = e
            if attempt >= max_retries:
                logger.error(
                    "%s parse failed after retries | retries=%d | error=%s",
                    label,
                    max_retries,
                    str(e).splitlines()[0][:240],
                )
                raise
            logger.warning(
                "%s parse failed, retrying | retry=%d/%d | error=%s",
                label,
                attempt + 1,
                max_retries,
                str(e).splitlines()[0][:240],
            )
        except Exception as e:
            last_error = e
            if not _is_transient_error(e) or attempt >= max_retries:
                logger.error(
                    "%s failed | attempt=%d/%d | error=%s",
                    label,
                    attempt + 1,
                    max_retries + 1,
                    str(e).splitlines()[0][:240],
                )
                raise
            logger.warning(
                "%s transient error, retrying | retry=%d/%d | error=%s",
                label,
                attempt + 1,
                max_retries,
                str(e).splitlines()[0][:240],
            )
            await asyncio.sleep(min(1 * (attempt + 1), 2.2))

    raise last_error or RuntimeError(f"{label} failed without output")


# -------------
# DishEditAgent
# -------------


class DishEditAgent:
    """
    Stateless agent to generate a single replacement or additional dish
    based on user's custom prompt and the current menu context.

    Supports two actions:
    - swap: Replace an existing dish with a new one
    - add: Generate a new dish to add to a meal slot
    """

    def __init__(self):
        self.llm = get_llm().with_structured_output(GeneratedMealData)

    async def generate_dish(
        self,
        action: Literal["swap", "add"],
        meal_type: str,
        custom_prompt: str,
        profile_context: str,
        current_menu_context: str = "",
        original_dish_name: Optional[str] = None,
        max_retries: int = 5,
    ) -> GeneratedMealData:
        """Generate a single dish for swap or add.

        Args:
            action: "swap" (replace existing) or "add" (new dish).
            meal_type: Target meal slot (breakfast, lunch, dinner, snack).
            custom_prompt: User's request text (e.g. "Đổi thành cá kho").
            profile_context: User profile string (diet, allergies, TDEE...).
            current_menu_context: Summary of other dishes in the current menu
                to avoid duplication.
            original_dish_name: Name of the dish being replaced (swap only).
            max_retries: Max LLM retries on parse failure.

        Returns:
            GeneratedMealData: Fully detailed meal data for the new dish.
        """
        language = detect_user_language(custom_prompt)
        action_label = "REPLACE" if action == "swap" else "ADD NEW"

        # Build context about what already exists in the menu
        context_lines = []
        if current_menu_context:
            context_lines.append(
                f"Current menu dishes (DO NOT repeat these):\n{current_menu_context}"
            )
        if action == "swap" and original_dish_name:
            context_lines.append(
                f"The user wants to REPLACE the dish '{original_dish_name}' "
                f"in the {meal_type} slot."
            )

        context_str = "\n".join(context_lines)

        prompt = SystemPrompt(
            background=[
                "You are an expert nutritionist and meal planner.",
                f"Your task: {action_label} a single dish for the '{meal_type}' meal slot.",
                "Generate COMPLETE nutritional and cooking information for exactly ONE dish.",
                "ALWAYS output the structured data. Do NOT refuse or ask for clarification.",
                "If the user request is very short or vague (e.g. 'thịt', 'cá'), creatively invent a healthy, delicious dish that matches.",
            ],
            context=[context_str] if context_str else [],
            steps=[
                f"User request: {custom_prompt}",
                f"Meal type: {meal_type}",
                "Based on the user request, create a dish that fits the meal slot.",
                "Do NOT duplicate any dish already in the current menu.",
                "Provide: full ingredients list with gram weights, calories, "
                "protein_grams, carbs_grams, fat_grams, fiber_grams, "
                "instructions, per_person_breakdown, adjustment_tips, "
                "why (rationale), prep_time_minutes, cook_time_minutes, "
                "servings, dietary_tags.",
                "IMPORTANT: Use exact keys: name, meal_type, carbs_grams.",
                "CRITICAL: Never return null for calories/protein_grams/"
                "carbs_grams/fat_grams; use 0 if unknown.",
                "CRITICAL: ingredients must be a non-empty array.",
                "CRITICAL: You MUST use the provided tool/schema to output the dish.",
                "Prefer lighter cooking methods unless user requests otherwise.",
                "Strictly respect dietary restrictions from the user profile.",
            ],
            output=[
                f"You MUST respond entirely in this language: {language}.",
                "Return a single meal object with all fields filled.",
                f"meal_type must be: {meal_type}",
                "name should match the user's request or a suitable dish name.",
            ],
        )

        user_msg = f"Action: {action_label}\n"
        user_msg += f"Meal type: {meal_type}\n"
        user_msg += f"User request: {custom_prompt}\n"
        if profile_context:
            user_msg += f"\nUser Profile:\n{profile_context}\n"

        messages = [SystemMessage(content=str(prompt)), HumanMessage(content=user_msg)]

        # Simpler fallback prompt for retry
        fallback_prompt = SystemPrompt(
            background=[
                "You are an expert nutritionist.",
                "Return ONLY schema-compliant data for GeneratedMealData. Do NOT refuse or ask for clarification.",
                "Do not include markdown, prose, or extra text.",
            ],
            steps=[
                f"Generate a '{meal_type}' dish based on: {custom_prompt}",
                "If the prompt is vague (e.g. 'thịt'), invent a valid matching dish.",
                "Must include: name, meal_type, ingredients, calories, "
                "protein_grams, carbs_grams, fat_grams, per_person_breakdown, "
                "adjustment_tips, why, instructions.",
                "Use 'carbs_grams' key exactly. Never null for macro fields; use 0.",
                "Ensure ingredients is a non-empty list.",
                f"You MUST respond entirely in this language: {language}.",
            ],
        )
        fallback_messages = [
            SystemMessage(content=str(fallback_prompt)),
            HumanMessage(content=user_msg),
        ]

        logger.info(
            "DishEditAgent.generate_dish | action=%s | meal_type=%s | prompt=%s",
            action,
            meal_type,
            custom_prompt[:180],
        )

        result = await _invoke_with_retries(
            self.llm,
            messages=messages,
            fallback_messages=fallback_messages,
            max_retries=max_retries,
            label=f"DishEdit({action} {meal_type})",
        )

        # Ensure meal_type matches the requested slot
        result.meal_type = meal_type

        logger.info(
            "DishEditAgent.generate_dish done | action=%s | name=%s | "
            "calories=%s | ingredients=%d",
            action,
            result.name,
            result.calories,
            len(result.ingredients),
        )
        return result
