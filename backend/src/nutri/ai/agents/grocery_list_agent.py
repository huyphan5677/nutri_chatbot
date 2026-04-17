# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import random
import asyncio
import logging

from pydantic import Field, BaseModel, field_validator, model_validator
from langchain_core.messages import HumanMessage, SystemMessage

from nutri.ai.language import detect_user_language
from nutri.ai.llm_client import get_llm
from nutri.ai.system_prompt import SystemPrompt


logger = logging.getLogger("nutri.ai.agents.grocery_list")


class GroceryItemData(BaseModel):
    name: str = Field(description="Normalized ingredient name")
    quantity: str | int | float = Field(
        description="Combined quantity and unit, e.g. '500g'."
    )
    category: str = Field(
        default="Other",
        description="Supermarket aisle, e.g. Produce, Dairy, Meat",
    )
    days: list[str] = Field(
        description="Days this ingredient is needed", default_factory=list
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_category_aliases(cls, value: dict) -> dict:
        if isinstance(value, dict):
            if not value.get("name"):
                value["name"] = value.get("item") or value.get("ingredient")
            if not value.get("category") and value.get("section"):
                value["category"] = value.get("section")
            if not value.get("category"):
                value["category"] = "Other"
            if value.get("quantity") is None:
                grams = value.get("grams") or value.get("gram_weight")
                if grams is not None:
                    value["quantity"] = f"{grams}g"
                else:
                    value["quantity"] = "1"
        return value

    @field_validator("quantity", mode="before")
    @classmethod
    def normalize_quantity(cls, value: str | float) -> str:
        if value is None:
            return "1"
        return str(value)


class GroceryListData(BaseModel):
    items: list[GroceryItemData]


class GroceryListGeneratorAgent:
    """Agent responsible for aggregating ingredients from a multi-day meal plan.

    Attributes:
        llm: The LLM client with structured output.

    Methods:
        agenerate: Asynchronously generates a categorized shopping list from
        a meal plan.
    """

    def __init__(self) -> None:
        self.llm = get_llm().with_structured_output(GroceryListData)

    async def agenerate(
        self, meal_plan_ingredients_context: str, max_retries: int = 5
    ) -> GroceryListData:
        """Asynchronously generates a categorized shopping list."""
        try:
            detected_lang = detect_user_language(meal_plan_ingredients_context)

            lang_instruction = (
                f"Detected language: '{detected_lang}'. "
                "You MUST respond entirely in this language."
            )
        except Exception:
            logger.exception("Failed to detect language")
            lang_instruction = "Respond in the same language as the input."

        prompt = SystemPrompt(
            background=["You are an expert at optimizing shopping lists."],
            steps=[
                f"LANGUAGE RULE (MANDATORY): {lang_instruction}",
                "ALL output text (item names, categories,...) MUST match that detected language.",
                "CRITICAL NORMALIZATION: You MUST strip all preparation instructions, adjectives, state descriptions, and parentheses from ingredient names. Output ONLY the core, base generic ingredient name.",
                "-> Examples: 'Hành lá thái nhỏ' -> 'Hành lá', 'Khoai lang vàng (nguyên vỏ, rửa sạch)' -> 'Khoai lang', 'Yến mạch nguyên hạt (khô, không đường)' -> 'Yến mạch', 'Gừng tươi băm nhuyễn' -> 'Gừng', 'Thịt bò xắt lát' -> 'Thịt bò'.",
                "CRITICAL CATEGORY: Strictly use these exact standard categories: 'Rau củ quả', 'Thịt cá & Hải sản', 'Trứng & Sữa', 'Ngũ cốc & Thực phẩm khô', 'Gia vị & Nước chấm', 'Đậu hạt & Đậu phụ', 'Đồ uống', 'Khác'.",
                "CRITICAL QUANTITY: Preserve gram values or counts accurately. Do not combine the item name with the count.",
                "Combine identical underlying items within your payload and sum their quantities.",
                "IMPORTANT: The output must be a flat array of GroceryItemData objects.",
                "CRITICAL: Every item MUST include the 'name' field. Do NOT omit the 'name'.",
                "CRITICAL: Use key name 'category' (NOT 'section') for the supermarket aisle field.",
            ],
        )

        messages = [
            SystemMessage(content=str(prompt)),
            HumanMessage(
                content=(
                    f"Raw Ingredients Data:\n{meal_plan_ingredients_context}\n\n"
                    "REMINDER: All item names and categories in your response "
                    "must match the language of the ingredients above."
                )
            ),
        ]

        logger.info(
            "GroceryListGeneratorAgent.agenerate | input_len=%d | message_preview=%s",
            len(meal_plan_ingredients_context),
            meal_plan_ingredients_context[:100] + "..."
            if len(meal_plan_ingredients_context) > 100
            else meal_plan_ingredients_context,
        )

        last_error = None
        for attempt in range(max_retries + 1):
            try:
                result = await self.llm.ainvoke(messages)
                logger.info(
                    "GroceryListGeneratorAgent.agenerate done | items=%d",
                    len(result.items),
                )
                return result

            except Exception as e:
                last_error = e
                err_text = str(e).lower()

                # Check for Langchain "NoneType not iterable" parsing errors
                # or standard rate limits
                is_transient = (
                    "nonetype" in err_text
                    or "invalid_request" in err_text
                    or "internal_failure" in err_text
                    or "rate limit" in err_text
                    or "service unavailable" in err_text
                    or "429" in err_text
                    or "406" in err_text
                    or "500" in err_text
                )

                if not is_transient or attempt >= max_retries:
                    logger.error(  # noqa: TRY400
                        "GroceryListGeneratorAgent parse failed | "
                        "attempt=%d/%d | err=%s",
                        attempt + 1,
                        max_retries + 1,
                        err_text[:240],
                    )
                    raise

                logger.warning(
                    "GroceryListGenerator transient error, retrying | "
                    "attempt=%d/%d | err=%s",
                    attempt + 1,
                    max_retries,
                    err_text[:240],
                )
                # Exponential backoff with jitter to help spread
                # parallel collisions
                sleep_time = min(2.0 * (2**attempt), 10.0) + random.uniform(  # noqa: S311
                    0.1, 1.5
                )
                await asyncio.sleep(sleep_time)

        raise last_error or RuntimeError(
            "GroceryListGenerator failed without output"
        )
