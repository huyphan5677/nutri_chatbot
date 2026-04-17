# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import json
import asyncio
import logging

from pydantic import Field, BaseModel, field_validator, model_validator
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.exceptions import OutputParserException

from nutri.ai.llm_client import get_llm
from nutri.ai.system_prompt import SystemPrompt
from nutri.ai.tools.menu_tools import fetch_historical_diet_log


logger = logging.getLogger("nutri.ai.agents.meal_plan")


# ----------------------------------
# Pydantic models — full meal detail
# ----------------------------------


class GeneratedMealData(BaseModel):
    name: str = Field(description="Name of the meal")
    description: str | None = None
    meal_type: str = Field(description="breakfast, lunch, dinner, or snack")
    cuisine: str | None = None
    calories: int | float | str = 0
    protein_grams: int | float | str = 0
    carbs_grams: int | float | str = 0
    fat_grams: int | float | str = 0
    fiber_grams: int | float | str | None = None
    ingredients: list[str] = []
    instructions: list[str] = []
    per_person_breakdown: list[str] = []
    adjustment_tips: list[str] = []
    why: str | None = None
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    servings: int | None = 1
    dietary_tags: list[str] = []

    @field_validator(
        "ingredients",
        "instructions",
        "per_person_breakdown",
        "adjustment_tips",
        mode="before",
    )
    @classmethod
    def split_string_to_list(cls, v):
        if v is None:
            return []
        if isinstance(v, str):
            if "[" in v and "]" in v:
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(i) for i in parsed]
                except:
                    pass
            # Fallback split
            if "\n" in v:
                return [i.strip() for i in v.split("\n") if i.strip()]
            return [i.strip() for i in v.split(",") if i.strip()]
        if isinstance(v, list):
            return [str(i).strip() for i in v if str(i).strip()]
        return v

    @model_validator(mode="before")
    @classmethod
    def normalize_common_aliases(cls, value: dict) -> dict:
        if not isinstance(value, dict):
            return value

        if not value.get("name") and value.get("meal_name"):
            value["name"] = value.get("meal_name")

        if not value.get("meal_type") and value.get("type"):
            value["meal_type"] = value.get("type")

        if not value.get("why"):
            for alias in ("why_this_meal", "reason", "rationale"):
                if value.get(alias):
                    value["why"] = value.get(alias)
                    break

        if not value.get("adjustment_tips"):
            for alias in ("adjustments", "adjust_tips", "adjust"):
                if value.get(alias):
                    value["adjustment_tips"] = value.get(alias)
                    break

        if not value.get("per_person_breakdown"):
            for alias in (
                "person_breakdown",
                "per_person_calories",
                "calorie_breakdown",
            ):
                if value.get(alias):
                    value["per_person_breakdown"] = value.get(alias)
                    break

        if not value.get("instructions"):
            for alias in ("steps", "directions", "method"):
                if value.get(alias):
                    value["instructions"] = value.get(alias)
                    break

        if value.get("carbs_grams") is None:
            if value.get("carb_grams") is not None:
                value["carbs_grams"] = value.get("carb_grams")
            elif value.get("carbohydrate_grams") is not None:
                value["carbs_grams"] = value.get("carbohydrate_grams")

        return value

    @field_validator(
        "calories",
        "protein_grams",
        "carbs_grams",
        "fat_grams",
        mode="before",
    )
    @classmethod
    def normalize_nullable_macros(
        cls, v: str | float | None
    ) -> str | float | int:
        if v is None:
            return 0
        return v

    glycemic_index_estimate: str | None = None
    glucose_impact_notes: str | None = None


class DayMealsData(BaseModel):
    meals: list[GeneratedMealData]
    day_header: str | None = None
    daily_summary_lines: list[str] = Field(default_factory=list)
    gap_fix: str | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_day_level_aliases(cls, value: dict) -> dict:
        if not isinstance(value, dict):
            return value

        if not value.get("daily_summary_lines"):
            for alias in ("daily_summary", "daily_totals", "summary_lines"):
                if value.get(alias):
                    value["daily_summary_lines"] = value.get(alias)
                    break

        if not value.get("gap_fix"):
            for alias in ("gap_fix_suggestion", "gap_adjustment", "gap_note"):
                if value.get(alias):
                    value["gap_fix"] = value.get(alias)
                    break

        return value


# -----------------------------------------------
# Pydantic models — lightweight skeleton (Step 1)
# -----------------------------------------------


class SkeletonMeal(BaseModel):
    """Lightweight meal placeholder — name + type + key ingredients only."""

    name: str = Field(description="Unique dish name for this meal")
    meal_type: str = Field(description="breakfast, lunch, dinner, or snack")
    key_ingredients: list[str] = Field(
        default_factory=list,
        description="2-3 main ingredients to ensure no duplication across meals",
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_skeleton_aliases(cls, value: dict) -> dict:
        if not isinstance(value, dict):
            return value
        if not value.get("name") and value.get("meal_name"):
            value["name"] = value.get("meal_name")
        if not value.get("meal_type") and value.get("type"):
            value["meal_type"] = value.get("type")
        if not value.get("key_ingredients"):
            for alias in (
                "main_ingredients",
                "primary_ingredients",
                "ingredients",
            ):
                if value.get(alias):
                    val = value.get(alias)
                    if isinstance(val, list):
                        value["key_ingredients"] = val[:3]
                    break
        return value


class SkeletonDayData(BaseModel):
    """Skeleton output for a single day — meal names and types only."""

    day_number: int = Field(description="The day number, e.g., 1, 2, 3")
    meals: list[SkeletonMeal]
    day_header: str | None = None


class SkeletonMultiDayData(BaseModel):
    """Skeleton output for multiple days."""

    days: list[SkeletonDayData]


# -------------------
# Shared retry helper
# -------------------


def _is_transient_llm_error(err: Exception) -> bool:
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
    )
    return any(marker in text for marker in transient_markers)


async def _invoke_with_retries(
    llm,
    messages: list,
    fallback_messages: list | None = None,
    max_retries: int = 5,
    label: str = "LLM",
):
    """Generic retry wrapper for structured-output LLM calls.

    Args:
        llm: The LLM client with structured output.
        messages: The messages to send to the LLM.
        fallback_messages: The fallback messages to send to the LLM.
        max_retries: The maximum number of retries.
        label: The label for the LLM.

    Returns:
        The result of the LLM call.

    Raises:
        OutputParserException: If the LLM call fails after all retries.
    """
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
                logger.error(  # noqa: TRY400
                    "%s parse failed after max retries | retries=%d | error=%s",
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
            if not _is_transient_llm_error(e) or attempt >= max_retries:
                logger.error(  # noqa: TRY400
                    "%s failed (non-retryable or exhausted) | "
                    "attempt=%d/%d | error=%s",
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
# MealPlanAgent
# -------------


class MealPlanAgent:
    """Stateless agent that generates a meal plan.

    Supports two generation strategies:
    - Legacy: `agenerate_for_day()` — single LLM call per day (full output).
    - Optimized: `agenerate_skeleton()` + `aenrich_meal()` — fast skeleton then
      parallel enrichment per meal.
    """

    def __init__(self) -> None:
        self.full_llm = get_llm().with_structured_output(DayMealsData)
        self.skeleton_llm = get_llm().with_structured_output(
            SkeletonMultiDayData
        )
        self.enrich_llm = get_llm().with_structured_output(GeneratedMealData)

    # --------------
    # Shared helpers
    # --------------

    async def get_recent_menu_context(
        self, config: dict | None = None, num_of_pre_day: int = 2
    ) -> str:
        """Fetch the previous 2 days of menu history to avoid repetition."""
        if not config:
            return ""

        try:
            language = (
                config.get("configurable", {}).get("language", "en")
                if config
                else "en"
            )
            user_id = (
                config.get("configurable", {}).get("user_id")
                if config
                else None
            )
            if not user_id:
                return ""

            recent_menu_context = await fetch_historical_diet_log(
                user_id=user_id,
                language=language,
                days_to_look_back_in_past=str(num_of_pre_day),
            )
        except Exception:
            logger.exception("Failed to load recent menu context")
            return ""

        context_text = str(recent_menu_context or "").strip()
        logger.info(
            "get_recent_menu_context | context_text=%s...", context_text[:180]
        )
        if not context_text or context_text.startswith("No menus found"):
            return ""

        return context_text

    def _build_user_msg(
        self,
        user_profile_context: str,
        day_number: int,
        total_days: int,
        previous_days_context: str | None = None,
        custom_prompt: str | None = None,
    ) -> str:
        user_msg = (
            # f"User Profile: {user_profile_context}\n"
            f"Generating Day {day_number} of {total_days}.\n"
        )
        if previous_days_context:
            user_msg += (
                "\nPrevious Days Context (Do not repeat main dishes):\n"
                f"{previous_days_context}"
            )
        if custom_prompt:
            user_msg += f"\nCustom Request: {custom_prompt}"
        return user_msg

    # --------------------------------------------
    # Step 1: Multi-day Skeleton generation (fast)
    # --------------------------------------------

    async def agenerate_multi_day_skeleton(
        self,
        user_profile_context: str,
        total_days: int,
        custom_prompt: str | None = None,
        max_parse_retries: int = 3,
        recent_menu_context: str | None = None,
        language: str = "en",
    ) -> SkeletonMultiDayData:
        """Generate a lightweight skeleton for all days: meal names and types only."""
        prompt = SystemPrompt(
            background=[
                "You are an expert nutritionist and meal planner.",
                "You should recommend meals according to the cuisine associated with the detected user language or country.",
                "Examples:",
                "   vi → Vietnamese cuisine",
                "   jp → Japanese cuisine",
                "   en → English cuisine",
                "You specialize in cuisine and provide practical meal plans.",
                "Your task is to produce a SKELETON menu for MULTIPLE DAYS at once — dish names and meal types ONLY.",
            ],
            steps=[
                "Review the user profile: number of people, dietary restrictions, and cuisine style.",
                f"You must plan exactly {total_days} days.",
                "CRITICAL: Review the entire plan across all days. Do NOT repeat the same main dish or main protein across the days to ensure variety.",
                "By default, plan breakfast, lunch, dinner, and 1 afternoon snack per day ONLY when the Custom Request does not restrict meal scope.",
                "CRITICAL: If the Custom Request says ONLY one or more specific meal slots such as dinner only, lunch only, breakfast only, snack only, 'toi nay', or 'bua trua', each day must contain ONLY those requested meal_type values.",
                "CRITICAL: When the Custom Request restricts meal scope, NEVER auto-add breakfast, lunch, dinner, or snack outside the requested scope.",
                "For each meal, provide: a unique dish name, meal_type, and 2-3 key_ingredients (main protein/starch/vegetable).",
                "Ensure maximum variety: day 1 meals should look very different from day 2 meals.",
                "Strictly respect dietary restrictions.",
                "Prefer lighter cooking methods.",
            ],
            output=[
                f"You MUST respond entirely in this language: {language}.",
                "Return a list of days.",
                "For each day return day_number, day_header, and a list of meals.",
                "If the Custom Request limits meal scope, return only those meals for each day and no placeholders for other meal types.",
                "For each meal return ONLY: name, meal_type, key_ingredients (2-3 items).",
                "Do NOT include calories, macros, full ingredient lists, instructions, or any other detail.",
            ],
        )

        user_msg = f"Generating a {total_days}-day meal plan.\n"
        if user_profile_context:
            user_msg += f"User Profile: {user_profile_context}\n"
        if recent_menu_context:
            user_msg += (
                "\nMenus from the previous 2 days (avoid repeating these dishes "
                "or main proteins):\n"
                f"{recent_menu_context}\n"
            )
        if custom_prompt:
            user_msg += f"\nCustom Request: {custom_prompt}"

        messages = [
            SystemMessage(content=str(prompt)),
            HumanMessage(content=user_msg),
        ]

        logger.info(
            "agenerate_multi_day_skeleton | generating %d days...",
            total_days,
        )

        result = await _invoke_with_retries(
            self.skeleton_llm,
            messages=messages,
            max_retries=max_parse_retries,
            label=f"MultiDaySkeleton (days={total_days})",
        )

        logger.info(
            "agenerate_multi_day_skeleton done | generated %d days",
            len(result.days),
        )
        return result

    # ---------------------------------------------------
    # Step 2: Single-meal enrichment (called in parallel)
    # ---------------------------------------------------

    async def aenrich_meal(
        self,
        meal_name: str,
        meal_type: str,
        key_ingredients: list[str],
        profile_context: str,
        custom_prompt: str | None = None,
        max_parse_retries: int = 5,
        language: str = "en",
    ) -> GeneratedMealData:
        """Enrich a single skeleton meal into full GeneratedMealData."""
        key_ing_str = (
            ", ".join(key_ingredients) if key_ingredients else "as appropriate"
        )
        prompt = SystemPrompt(
            background=[
                "You are an expert nutritionist and meal planner.",
                "You are given a specific dish to detail. Provide COMPLETE nutritional and cooking information.",
            ],
            steps=[
                f"Dish to detail: **{meal_name}** (meal_type: {meal_type}).",
                f"Key ingredients to use: {key_ing_str}.",
                "Provide: full ingredients list with gram weights, per_person_breakdown, calories, protein_grams, carbs_grams, fat_grams, fiber_grams, instructions, adjustment_tips, why (rationale), prep_time_minutes, cook_time_minutes, servings, dietary_tags.",
                "If multiple people share this meal, include per-person portion/calorie lines in per_person_breakdown.",
                "IMPORTANT: Use exact keys: name, meal_type, carbs_grams.",
                "CRITICAL: Never return null for calories/protein_grams/carbs_grams/fat_grams; use 0 if unknown.",
                "CRITICAL: ingredients must be a non-empty array with practical items and gram weights.",
                "Prefer lighter cooking methods: grilling, steaming, boiling, light stir-fry.",
                "Strictly respect any dietary restrictions mentioned in the profile or custom request.",
            ],
            output=[
                f"You MUST respond entirely in this language: {language}.",
                "Return a single meal object with all fields filled.",
                "name must match the provided dish name exactly.",
                f"meal_type must be: {meal_type}",
            ],
        )

        user_msg = f"Detail this meal: {meal_name} ({meal_type})\n"
        if profile_context:
            user_msg += f"\nUser Profile:\n{profile_context}\n"
        if custom_prompt:
            user_msg += f"\nCustom Request: {custom_prompt}"

        messages = [
            SystemMessage(content=str(prompt)),
            HumanMessage(content=user_msg),
        ]

        fallback_prompt = SystemPrompt(
            background=[
                "You are an expert nutritionist.",
                "Return ONLY schema-compliant data for GeneratedMealData.",
                "Do not include markdown, prose, or shopping list text.",
            ],
            steps=[
                f"Detail the meal: {meal_name} (meal_type: {meal_type}).",
                "Must include: name, meal_type, ingredients, calories, protein_grams, carbs_grams, fat_grams, per_person_breakdown, adjustment_tips, why, instructions.",
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
            "aenrich_meal | meal=%s (%s) | enriching...", meal_name, meal_type
        )

        result = await _invoke_with_retries(
            self.enrich_llm,
            messages=messages,
            fallback_messages=fallback_messages,
            max_retries=max_parse_retries,
            label=f"Enrich '{meal_name}'",
        )

        # Ensure the name and meal_type match the skeleton
        result.name = meal_name
        result.meal_type = meal_type

        logger.info(
            "aenrich_meal done | meal=%s | calories=%s | ingredients=%d",
            meal_name,
            result.calories,
            len(result.ingredients),
        )
        return result

    # ---------------------------------------------------------
    # Legacy: full single-call generation (backward-compatible)
    # ---------------------------------------------------------

    async def agenerate_for_day(
        self,
        user_profile_context: str,
        day_number: int,
        total_days: int,
        previous_days_context: str | None = None,
        custom_prompt: str | None = None,
        max_parse_retries: int = 5,
        language: str = "en",
    ) -> DayMealsData:
        """Asynchronously generates a meal plan for a single day (legacy single-call)."""
        prompt = SystemPrompt(
            background=[
                "You are an expert nutritionist and meal planner.",
                "You specialize in cuisine and provide detailed, practical meal plans.",
                "Your plans must feel like real, not generic healthy food.",
            ],
            steps=[
                "Review the user profile: number of people, each person's calorie target, dietary restrictions, and cuisine style.",
                "Review previous days' meals to avoid repeating the same dish within a 2-day window.",
                "By default, generate breakfast, lunch, dinner, and 1 afternoon snack ONLY when the Custom Request does not restrict meal scope.",
                "CRITICAL: If the Custom Request asks for specific meals (for example only lunch or dinner, toi nay, trua nay, sang mai, dem nay), generate ONLY those requested meals and NEVER add other meal types.",
                "If multiple people share a meal, keep one shared dish name and include separate per-person portion/calorie lines in per_person_breakdown.",
                "For each meal include: dish name, ingredients with gram weights, per-person calories, 1-2 adjustment tips, and short rationale.",
                "At day level include daily totals per person and gap-vs-target lines in daily_summary_lines, with a concrete gap_fix when |gap| > 100 kcal.",
                "IMPORTANT: Use exact keys: name, meal_type, carbs_grams.",
                "CRITICAL: Never return null for calories/protein_grams/carbs_grams/fat_grams; use 0 if unknown.",
                "CRITICAL: Every meal must have non-empty ingredients array with practical items and gram weights.",
                "Strictly respect dietary restrictions for all meals and cooking suggestions.",
                "Prefer lighter methods: grilling, steaming, boiling, light stir-fry; avoid deep-frying unless explicitly requested.",
                "Generate the meals for the requested day.",
            ],
            output=[
                f"You MUST respond entirely in this language: {language}.",
                "day_header: Day {N} - {X} people - Targets: {per-person kcal list}",
                "For each meal return keys: meal_type, name, ingredients, per_person_breakdown, calories, adjustment_tips, why, instructions.",
                "daily_summary_lines should include per-person total kcal, target, and gap.",
                "gap_fix should include specific food and gram amount if gap magnitude is over 100 kcal.",
            ],
        )

        fallback_prompt = SystemPrompt(
            background=[
                "You are an expert nutritionist and meal planner.",
                "Return ONLY schema-compliant data for DayMealsData.",
                "Do not include markdown, prose, headers, summaries, or shopping list text.",
            ],
            steps=[
                "Output a meals array only.",
                "Each meal must include: name, meal_type, ingredients, calories, protein_grams, carbs_grams, fat_grams, per_person_breakdown, adjustment_tips, why, instructions.",
                "Day-level optional fields allowed: day_header, daily_summary_lines, gap_fix.",
                "Use 'carbs_grams' key exactly.",
                "Never output null for macro fields; use 0 when unknown.",
                "Ensure ingredients is a non-empty list.",
                f"You MUST respond entirely in this language: {language}.",
            ],
        )

        user_msg = self._build_user_msg(
            user_profile_context=user_profile_context,
            day_number=day_number,
            total_days=total_days,
            previous_days_context=previous_days_context,
            custom_prompt=custom_prompt,
        )

        logger.debug(
            "MealPlanAgent.agenerate_for_day | day=%d/%d | user_msg=%s",
            day_number,
            total_days,
            user_msg,
        )

        messages = [
            SystemMessage(content=str(prompt)),
            HumanMessage(content=user_msg),
        ]
        fallback_messages = [
            SystemMessage(content=str(fallback_prompt)),
            HumanMessage(content=user_msg),
        ]

        logger.info(
            "MealPlanAgent.agenerate_for_day | day=%d/%d",
            day_number,
            total_days,
        )

        result = await _invoke_with_retries(
            self.full_llm,
            messages=messages,
            fallback_messages=fallback_messages,
            max_retries=max_parse_retries,
            label=f"FullDay day={day_number}",
        )

        logger.info(
            "MealPlanAgent.agenerate_for_day done | day=%d | meals=%d",
            day_number,
            len(result.meals),
        )
        logger.debug(
            "MealPlanAgent.agenerate_for_day result | day=%d | result=%s",
            day_number,
            result.json(),
        )
        return result
