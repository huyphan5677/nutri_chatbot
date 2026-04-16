# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from typing import TYPE_CHECKING
from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select

from nutri.core.menus.dto import (
    MealDTO,
    RecipeDTO,
    MealPlanResponse,
    RecipeIngredientDTO,
)
from nutri.core.menus.models import Meal, Recipe, MealPlan, RecipeIngredient


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from nutri.core.menus.dto import (
        UpdateMenuRequest,
        SaveMenuShoppingItem,
        UpdateCurrentMenuRequest,
    )


def format_quantity_grams(quantity) -> str:
    """Format quantity in grams."""
    if quantity is None:
        return "as needed"
    try:
        value = float(quantity)
        text = str(int(value)) if value.is_integer() else f"{value:g}"
        return f"{text}g"
    except Exception:
        clean = str(quantity).strip()
        return clean or "as needed"


def find_meal_plan_draft(tool_calls):
    """Find meal plan draft in tool calls."""
    if not isinstance(tool_calls, list):
        return None, None

    for idx, item in enumerate(tool_calls):
        if isinstance(item, dict) and item.get("type") == "meal_plan_draft":
            data = item.get("data")
            if isinstance(data, dict):
                return idx, data
    return None, None


def build_shopping_list_message(
    shopping_list: list[SaveMenuShoppingItem],
) -> str:
    """Build shopping list message."""
    if not shopping_list:
        return "Shopping list is empty."

    grouped: dict[str, list[SaveMenuShoppingItem]] = {}
    for item in shopping_list:
        key = item.category or "Other"
        grouped.setdefault(key, []).append(item)

    lines: list[str] = [
        "Shopping list is empty." if not shopping_list else "🛍️ 🛒"
    ]
    for category, items in grouped.items():
        lines.append(f"\n[{category}]")
        for item in items:
            lines.append(f"- {item.name}: {item.quantity}")
    return "\n".join(lines)


def parse_date_field(value: str, field_name: str) -> date:
    """Parse date field.

    Args:
        value: Date string
        field_name: Field name

    Returns:
        date: Parsed date

    Raises:
        HTTPException: If date is invalid
    """
    try:
        return date.fromisoformat(value)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be in YYYY-MM-DD format",
        ) from exc


async def apply_menu_updates(
    db: AsyncSession,
    meal_plan: MealPlan,
    payload: UpdateCurrentMenuRequest | UpdateMenuRequest,
):
    """Apply menu updates.

    Args:
        db: AsyncSession
        meal_plan: MealPlan
        payload: UpdateCurrentMenuRequest | UpdateMenuRequest

    Raises:
        HTTPException: If menu name or status is empty, or if total_days or total_meals is invalid.
    """
    if payload.name is not None:
        clean_name = payload.name.strip()
        if not clean_name:
            raise HTTPException(
                status_code=400, detail="Menu name cannot be empty"
            )
        meal_plan.name = clean_name

    if payload.status is not None:
        clean_status = payload.status.strip()
        if not clean_status:
            raise HTTPException(
                status_code=400, detail="Menu status cannot be empty"
            )
        meal_plan.status = clean_status

    next_start_date = meal_plan.start_date
    next_end_date = meal_plan.end_date

    if payload.start_date is not None:
        next_start_date = parse_date_field(payload.start_date, "start_date")

    if payload.end_date is not None:
        next_end_date = parse_date_field(payload.end_date, "end_date")

    if payload.total_days is not None:
        if payload.total_days < 1:
            raise HTTPException(
                status_code=400, detail="total_days must be >= 1"
            )
        next_end_date = next_start_date + timedelta(days=payload.total_days - 1)

    if next_end_date < next_start_date:
        raise HTTPException(
            status_code=400,
            detail="end_date must be greater than or equal to start_date",
        )

    meal_plan.start_date = next_start_date
    meal_plan.end_date = next_end_date

    if payload.total_meals is not None:
        if payload.total_meals < 1:
            raise HTTPException(
                status_code=400, detail="total_meals must be >= 1"
            )

        meals_sorted = sorted(
            meal_plan.meals or [],
            key=lambda m: (m.eat_date or next_start_date, str(m.id)),
        )
        current_total = len(meals_sorted)

        if payload.total_meals < current_total:
            for meal in meals_sorted[payload.total_meals :]:
                await db.delete(meal)
        elif payload.total_meals > current_total:
            if current_total == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot increase total_meals for an empty menu",
                )

            template = meals_sorted[-1]
            for _ in range(payload.total_meals - current_total):
                db.add(
                    Meal(
                        meal_plan_id=meal_plan.id,
                        recipe_id=template.recipe_id,
                        eat_date=template.eat_date,
                        meal_type=template.meal_type,
                        servings=template.servings,
                        adjusted_instructions=template.adjusted_instructions,
                    )
                )


def meal_plan_to_response(meal_plan: MealPlan) -> MealPlanResponse:
    """Convert MealPlan to MealPlanResponse.

    Args:
        meal_plan: MealPlan

    Returns:
        MealPlanResponse: MealPlanResponse
    """
    meals_dto = []
    for meal in meal_plan.meals:
        if meal.recipe:
            recipe_dto = RecipeDTO(
                id=str(meal.recipe.id),
                name=meal.recipe.name,
                description=meal.recipe.description,
                instructions=meal.recipe.instructions,
                prep_time_minutes=meal.recipe.prep_time_minutes,
                cook_time_minutes=meal.recipe.cook_time_minutes,
                total_calories=meal.recipe.total_calories,
                dietary_tags=meal.recipe.dietary_tags or [],
                macros=meal.recipe.macros or {},
                ingredients=[
                    RecipeIngredientDTO(
                        name=ri.ingredient.name if ri.ingredient else "Unknown",
                        quantity=float(ri.quantity)
                        if ri.quantity is not None
                        else None,
                    )
                    for ri in (meal.recipe.ingredients or [])
                ],
            )
            meals_dto.append(
                MealDTO(
                    id=str(meal.id),
                    eat_date=str(meal.eat_date),
                    meal_type=meal.meal_type,
                    recipe=recipe_dto,
                )
            )

    return MealPlanResponse(
        id=str(meal_plan.id),
        name=meal_plan.name,
        start_date=str(meal_plan.start_date),
        end_date=str(meal_plan.end_date),
        status=meal_plan.status,
        meals=meals_dto,
    )


async def get_latest_meal_plan(
    db: AsyncSession,
    user_id: str,
) -> MealPlan | None:
    """Get latest meal plan.

    Args:
        db: AsyncSession
        user_id: User ID

    Returns:
        MealPlan | None: Meal plan
    """
    result = await db.execute(
        select(MealPlan)
        .options(
            selectinload(MealPlan.meals)
            .selectinload(Meal.recipe)
            .selectinload(Recipe.ingredients)
            .selectinload(RecipeIngredient.ingredient)
        )
        .where(MealPlan.user_id == user_id)
        .order_by(desc(MealPlan.created_at))
    )
    return result.scalars().first()


async def get_user_meal_plan_by_id(
    db: AsyncSession,
    user_id: str,
    meal_plan_id: str,
) -> MealPlan | None:
    """Get user meal plan by ID.

    Args:
        db: AsyncSession
        user_id: User ID
        meal_plan_id: Meal plan ID

    Returns:
        MealPlan | None: Meal plan
    """
    result = await db.execute(
        select(MealPlan)
        .options(
            selectinload(MealPlan.meals)
            .selectinload(Meal.recipe)
            .selectinload(Recipe.ingredients)
            .selectinload(RecipeIngredient.ingredient)
        )
        .where(MealPlan.user_id == user_id, MealPlan.id == meal_plan_id)
    )
    return result.scalars().first()
