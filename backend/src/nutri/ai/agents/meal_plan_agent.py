import asyncio
import logging
from typing import List, Optional, Union

from langchain_core.exceptions import OutputParserException
from langchain_core.messages import HumanMessage, SystemMessage
from nutri.ai.llm_client import get_llm
from nutri.ai.system_prompt import SystemPrompt
from pydantic import BaseModel, Field, field_validator, model_validator

logger = logging.getLogger("nutri.ai.agents.meal_plan")


class GeneratedMealData(BaseModel):
    name: str = Field(description="Name of the meal")
    description: Optional[str] = None
    meal_type: str = Field(description="breakfast, lunch, dinner, or snack")
    cuisine: Optional[str] = None
    calories: Union[int, float, str] = 0
    protein_grams: Union[int, float, str] = 0
    carbs_grams: Union[int, float, str] = 0
    fat_grams: Union[int, float, str] = 0
    fiber_grams: Optional[Union[int, float, str]] = None
    ingredients: List[str] = []
    instructions: List[str] = []
    per_person_breakdown: List[str] = []
    adjustment_tips: List[str] = []
    why: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    servings: Optional[int] = 1
    dietary_tags: List[str] = []

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
                import json

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
    def normalize_common_aliases(cls, value):
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
    def normalize_nullable_macros(cls, v):
        if v is None:
            return 0
        return v

    glycemic_index_estimate: Optional[str] = None
    glucose_impact_notes: Optional[str] = None


class DayMealsData(BaseModel):
    meals: List[GeneratedMealData]
    day_header: Optional[str] = None
    daily_summary_lines: List[str] = Field(default_factory=list)
    gap_fix: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_day_level_aliases(cls, value):
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


class MealPlanAgent:
    """
    Stateless agent that generates a meal plan for a single day or multiple days.
    Often called in a workflow loop to build a full week without hitting token limits.
    """

    def __init__(self):
        self.llm = get_llm().with_structured_output(DayMealsData)

    def _build_user_msg(
        self,
        user_profile_context: str,
        day_number: int,
        total_days: int,
        previous_days_context: Optional[str] = None,
        custom_prompt: Optional[str] = None,
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

    async def agenerate_for_day(
        self,
        user_profile_context: str,
        day_number: int,
        total_days: int,
        previous_days_context: Optional[str] = None,
        custom_prompt: Optional[str] = None,
        max_parse_retries: int = 5,
    ) -> DayMealsData:
        """Asynchronously generates a meal plan for a single day."""

        def is_transient_llm_error(err: Exception) -> bool:
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
            )
            return any(marker in text for marker in transient_markers)

        prompt = SystemPrompt(
            background=[
                "You are an expert nutritionist and meal planner.",
                "You specialize in cuisine and provide detailed, practical meal plans.",
                "Your plans must feel like real, not generic healthy food.",
            ],
            steps=[
                "Review the user profile: number of people, each person's calorie target, dietary restrictions, and cuisine style.",
                "Review previous days' meals to avoid repeating the same dish within a 2-day window.",
                "By default, generate breakfast, lunch, dinner, and 1 afternoon snack. However, if the Custom Request asks for specific meals (e.g., only lunch or dinner, tối nay, trưa nay, sáng mai, đêm nay,...), generate ONLY those requested meals.",
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

        messages = [SystemMessage(content=str(prompt)), HumanMessage(content=user_msg)]
        retry_messages = [
            SystemMessage(content=str(fallback_prompt)),
            HumanMessage(content=user_msg),
        ]
        logger.info(
            "MealPlanAgent.agenerate_for_day | day=%d/%d", day_number, total_days
        )
        last_error = None
        result: Optional[DayMealsData] = None
        for attempt in range(max_parse_retries + 1):
            try:
                # First attempt uses the rich prompt; retries enforce stricter output formatting.
                invoke_messages = messages if attempt == 0 else retry_messages
                result = await self.llm.ainvoke(invoke_messages)
                break
            except OutputParserException as e:
                last_error = e
                if attempt >= max_parse_retries:
                    logger.error(
                        "MealPlanAgent.agenerate_for_day parse failed after max retries | day=%d/%d | retries=%d | error=%s",
                        day_number,
                        total_days,
                        max_parse_retries,
                        str(e).splitlines()[0][:240],
                    )
                    raise
                logger.warning(
                    "MealPlanAgent.agenerate_for_day parse failed, retrying with strict output format | day=%d/%d | retry=%d/%d | error=%s",
                    day_number,
                    total_days,
                    attempt + 1,
                    max_parse_retries,
                    str(e).splitlines()[0][:240],
                )
            except Exception as e:
                last_error = e
                if not is_transient_llm_error(e) or attempt >= max_parse_retries:
                    logger.error(
                        "MealPlanAgent.agenerate_for_day failed with non-retryable or exhausted error | day=%d/%d | attempt=%d/%d | error=%s",
                        day_number,
                        total_days,
                        attempt + 1,
                        max_parse_retries + 1,
                        str(e).splitlines()[0][:240],
                    )
                    raise

                logger.warning(
                    "MealPlanAgent.agenerate_for_day transient LLM error, retrying | day=%d/%d | retry=%d/%d | error=%s",
                    day_number,
                    total_days,
                    attempt + 1,
                    max_parse_retries,
                    str(e).splitlines()[0][:240],
                )
                await asyncio.sleep(min(0.8 * (attempt + 1), 2.0))

        if result is None:
            raise last_error or RuntimeError(
                "MealPlanAgent.agenerate_for_day failed without parser output"
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
