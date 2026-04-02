import logging
from importlib import import_module
from importlib.util import find_spec
from typing import List, Union

from langchain_core.messages import HumanMessage, SystemMessage
from nutri.ai.llm_client import get_llm
from nutri.ai.system_prompt import SystemPrompt
from pydantic import BaseModel, Field, field_validator, model_validator

logger = logging.getLogger("nutri.ai.agents.grocery_list")


class GroceryItemData(BaseModel):
    name: str = Field(description="Normalized ingredient name")
    quantity: Union[str, int, float] = Field(
        description="Combined quantity and unit, e.g. '500g'."
    )
    category: str = Field(
        default="Other",
        description="Supermarket aisle, e.g. Produce, Dairy, Meat",
    )
    days: List[str] = Field(
        description="Days this ingredient is needed", default_factory=list
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_category_aliases(cls, value):
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
    def normalize_quantity(cls, value):
        if value is None:
            return "1"
        return str(value)


class GroceryListData(BaseModel):
    items: List[GroceryItemData]


class GroceryListGeneratorAgent:
    """
    Agent responsible for aggregating ingredients from a multi-day meal plan
    and outputting a categorized shopping list.
    """

    def __init__(self):
        self.llm = get_llm().with_structured_output(GroceryListData)

    async def agenerate(self, meal_plan_ingredients_context: str) -> GroceryListData:
        """Asynchronously generates a categorized shopping list from a meal plan."""
        try:
            from nutri.ai.language import detect_user_language
            detected_lang = detect_user_language(meal_plan_ingredients_context)

            lang_instruction = (
                f"Detected language: '{detected_lang}'. "
                "You MUST respond entirely in this language."
            )
        except Exception:
            lang_instruction = "Respond in the same language as the input."

        prompt = SystemPrompt(
            background=["You are an expert at optimizing shopping lists."],
            steps=[
                f"LANGUAGE RULE (MANDATORY): {lang_instruction}",
                "ALL output text (item names, categories,...) MUST match that detected language.",
                "CRITICAL: Keep ingredient names EXACTLY as provided in input. Never translate, localize, or rename ingredient names.",
                "CRITICAL: Preserve quantity units and gram values from input when available (e.g. 150g stays 150g).",
                "Analyze the raw ingredients list from the meal plan.",
                "Combine identical items and sum their quantities appropriately.",
                "Categorize them into logical supermarket sections, and write category labels in the detected input language.",
                "MANDATORY CATEGORY: If ANY spices, seasonings, condiments, or flavor enhancers are present (e.g. salt, pepper, fish sauce, soy sauce, sugar, oil, olive oil, vinegar, chili, garlic powder, MSG, bouillon), they MUST be grouped under a single dedicated spices/seasonings category. In Vietnamese: 'Gia vị & Nước chấm', in English: 'Spices & Condiments', in other languages: use the equivalent local term.",
                "IMPORTANT: The output must be a flat array of GroceryItemData objects.",
                "CRITICAL: Every item MUST include the 'name' field (the ingredient name, e.g., 'Olive Oil'). Do NOT omit the 'name'.",
                "CRITICAL: Use key name 'category' (NOT 'section') for the supermarket aisle field.",
            ],
        )

        messages = [
            SystemMessage(content=str(prompt)),
            HumanMessage(
                content=(
                    f"Raw Ingredients Data:\n{meal_plan_ingredients_context}\n\n"
                    "REMINDER: All item names and categories in your response must match the language of the ingredients above."
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
        result = await self.llm.ainvoke(messages)
        logger.info(
            "GroceryListGeneratorAgent.agenerate done | items=%d", len(result.items)
        )
        return result
