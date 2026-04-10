import logging
import re
from collections import defaultdict
from datetime import date, timedelta

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from nutri.ai.language import get_language_from_config
from nutri.core.db.session import async_session_maker
from nutri.core.menus.models import Meal, MealPlan, Recipe, RecipeIngredient
from nutri.core.menus.services import format_quantity_grams
from sqlalchemy import desc
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

logger = logging.getLogger("nutri.ai.tools.menu_tools")


def _parse_days_back(days_text: str) -> int | None:
    """Parse text into a day window for past history or None for full history."""
    text = str(days_text or "all").strip().lower()
    if not text or text in {"all", "previous", "history", "all_previous"}:
        return None

    if text.isdigit():
        return max(int(text), 1)

    match = re.search(r"(\d+)", text)
    if match:
        return max(int(match.group(1)), 1)

    raise ValueError(
        "days_to_look_back_in_past must be 'all' or a positive day count such as '7', '7d', or 'days:7'"
    )


def _plan_matches_window(
    meal_plan: MealPlan, window_start: date, window_end: date
) -> bool:
    for meal in meal_plan.meals or []:
        if meal.eat_date and window_start <= meal.eat_date <= window_end:
            return True

    if meal_plan.start_date and meal_plan.end_date:
        return not (
            meal_plan.end_date < window_start or meal_plan.start_date > window_end
        )

    return False


def _format_previous_menus(
    meal_plans: list[MealPlan],
    language: str,
    days_to_look_back: str,
    days_back: int | None,
) -> str:
    if not meal_plans:
        if days_back is None:
            return (
                f"No previous menus found.\nTarget response language code: {language}"
            )
        return (
            f"No menus found in the previous {days_back} day(s).\n"
            f"Target response language code: {language}"
        )

    lines = [
        "Previous menu history:",
        f"Requested past timeframe: {days_to_look_back}",
        f"Target response language code: {language}",
    ]

    if days_back is None:
        lines.append(f"Total previous menus: {len(meal_plans)}")
    else:
        lines.append(f"Menus matched in previous {days_back} day(s): {len(meal_plans)}")

    for idx, meal_plan in enumerate(meal_plans, start=1):
        lines.append("")
        lines.append(f"Menu {idx}:")
        lines.append(f"- id: {meal_plan.id}")
        lines.append(f"- name: {meal_plan.name or 'Unnamed menu'}")
        lines.append(
            f"- range: {meal_plan.start_date or 'N/A'} to {meal_plan.end_date or 'N/A'}"
        )
        lines.append(f"- status: {meal_plan.status or 'unknown'}")
        lines.append(f"- created_at: {meal_plan.created_at or 'N/A'}")

        meals_by_date: dict[date | None, list[str]] = defaultdict(list)
        for meal in sorted(
            meal_plan.meals or [],
            key=lambda item: (
                item.eat_date or meal_plan.start_date or date.min,
                item.meal_type or "",
                item.recipe.name if item.recipe and item.recipe.name else "",
            ),
        ):
            recipe_name = meal.recipe.name if meal.recipe else "Unknown recipe"
            meals_by_date[meal.eat_date].append(
                f"{meal.meal_type or 'meal'}: {recipe_name}"
            )

        if meals_by_date:
            lines.append("- meals:")
            for eat_date, entries in meals_by_date.items():
                day_label = str(eat_date) if eat_date else "unknown_date"
                lines.append(f"  {day_label}")
                for entry in entries:
                    lines.append(f"  - {entry}")
        else:
            lines.append("- meals: none")

    return "\n".join(lines)


async def fetch_historical_diet_log(
    user_id: str,
    language: str,
    days_to_look_back_in_past: str,
) -> str:
    """Internal function without LangChain tracing wrappers."""
    try:
        days_back = _parse_days_back(days_to_look_back_in_past)
    except ValueError as exc:
        return f"{exc}\nTarget response language code: {language}"

    today = date.today()
    window_end = today - timedelta(days=1)
    window_start = window_end - timedelta(days=days_back - 1) if days_back else None

    async with async_session_maker() as db:
        result = await db.execute(
            select(MealPlan)
            .options(selectinload(MealPlan.meals).selectinload(Meal.recipe))
            .where(MealPlan.user_id == user_id)
            .order_by(desc(MealPlan.start_date), desc(MealPlan.created_at))
        )
        all_meal_plans = result.scalars().all()

    if days_back is None:
        previous_meal_plans = list(all_meal_plans)
    else:
        previous_meal_plans = [
            meal_plan
            for meal_plan in all_meal_plans
            if window_start
            and _plan_matches_window(meal_plan, window_start, window_end)
        ]

    logger.info(
        "fetch_historical_diet_log | user_id=%s | days_to_look_back=%s | matched=%d",
        user_id,
        days_to_look_back_in_past,
        len(previous_meal_plans),
    )

    return _format_previous_menus(
        meal_plans=previous_meal_plans,
        language=language,
        days_to_look_back=days_to_look_back_in_past,
        days_back=days_back,
    )


@tool("view_historical_diet_log")
async def get_overview_menu_previous(
    days_to_look_back_in_past: str = "all", *, config: RunnableConfig
) -> str:
    """
    Retrieve the current user's PAST/PREVIOUS saved meal plans.

    WARNING: DO NOT use this tool to CREATE, PLAN, or GENERATE new menus.
    ONLY USE THIS TOOL when the user explicitly asks to view their history
    or past menus (e.g., "show me the past menu from 2 days ago", "what did I eat last week?", "view all old menus").

    Args:
        days_to_look_back_in_past:
            - "all": return all saved past menu history.
            - "<n>": return old menus from exactly n days in the past.
    """
    language = get_language_from_config(config)
    user_id = config.get("configurable", {}).get("user_id")
    if not user_id:
        return "Authentication required to view previous menus."

    return await fetch_historical_diet_log(user_id, language, days_to_look_back_in_past)


@tool("view_historical_diet_log_detail")
async def get_detail_menu_previous_by_id(
    log_id: str, *, config: RunnableConfig
) -> str:
    """
    Retrieve detailed information for one saved historical log by id.

    Args:
        log_id: Meal plan id returned by `view_historical_diet_log`.
    """
    language = get_language_from_config(config)
    user_id = config.get("configurable", {}).get("user_id")
    if not user_id:
        return "Authentication required to view menu details."

    clean_menu_id = str(log_id or "").strip()
    if not clean_menu_id:
        return f"log_id is required.\nTarget response language code: {language}"

    async with async_session_maker() as db:
        result = await db.execute(
            select(MealPlan)
            .options(
                selectinload(MealPlan.meals)
                .selectinload(Meal.recipe)
                .selectinload(Recipe.ingredients)
                .selectinload(RecipeIngredient.ingredient)
            )
            .where(MealPlan.user_id == user_id, MealPlan.id == clean_menu_id)
        )
        meal_plan = result.scalars().first()

    if not meal_plan:
        return (
            f"Menu not found for id: {clean_menu_id}\n"
            f"Target response language code: {language}"
        )

    meals = sorted(
        meal_plan.meals or [],
        key=lambda item: (
            item.eat_date or meal_plan.start_date or date.min,
            item.meal_type or "",
            item.recipe.name if item.recipe and item.recipe.name else "",
        ),
    )

    lines = [
        "Menu detail:",
        f"Target response language code: {language}",
        f"- id: {meal_plan.id}",
        f"- name: {meal_plan.name or 'Unnamed menu'}",
        f"- range: {meal_plan.start_date or 'N/A'} to {meal_plan.end_date or 'N/A'}",
        f"- status: {meal_plan.status or 'unknown'}",
        f"- created_at: {meal_plan.created_at or 'N/A'}",
    ]

    if not meals:
        lines.append("- meals: none")
        return "\n".join(lines)

    grouped_meals: dict[date | None, list[Meal]] = defaultdict(list)
    for meal in meals:
        grouped_meals[meal.eat_date].append(meal)

    lines.append("- meals:")
    for eat_date, date_meals in grouped_meals.items():
        lines.append(f"  {eat_date or 'unknown_date'}")
        for meal in date_meals:
            recipe = meal.recipe
            if not recipe:
                lines.append(f"  - {meal.meal_type or 'meal'}: Unknown recipe")
                continue

            lines.append(f"  - {meal.meal_type or 'meal'}: {recipe.name}")
            lines.append(f"    recipe_id: {recipe.id}")
            lines.append(f"    servings: {meal.servings or 'N/A'}")
            lines.append(f"    calories: {recipe.total_calories or 'N/A'}")
            lines.append(f"    prep_time_minutes: {recipe.prep_time_minutes or 'N/A'}")
            lines.append(f"    cook_time_minutes: {recipe.cook_time_minutes or 'N/A'}")
            lines.append(f"    dietary_tags: {recipe.dietary_tags or []}")
            lines.append(f"    macros: {recipe.macros or {}}")
            if recipe.description:
                lines.append(f"    description: {recipe.description}")

            ingredients = recipe.ingredients or []
            if ingredients:
                lines.append("    ingredients:")
                for recipe_ingredient in ingredients:
                    ingredient_name = (
                        recipe_ingredient.ingredient.name
                        if recipe_ingredient.ingredient
                        else "Unknown ingredient"
                    )
                    lines.append(
                        "    - "
                        f"{ingredient_name}: {format_quantity_grams(recipe_ingredient.quantity)}"
                    )
            else:
                lines.append("    ingredients: []")

            instructions = str(recipe.instructions or "").strip()
            if instructions:
                lines.append(f"    instructions: {instructions}")

            adjusted_instructions = str(meal.adjusted_instructions or "").strip()
            if adjusted_instructions:
                lines.append(f"    adjusted_instructions: {adjusted_instructions}")

    logger.info(
        "get_detail_menu_previous_by_id | user_id=%s | menu_id=%s | meals=%d",
        user_id,
        clean_menu_id,
        len(meals),
    )

    return "\n".join(lines)
