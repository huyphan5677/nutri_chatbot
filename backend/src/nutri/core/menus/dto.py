# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from pydantic import BaseModel


class RecipeIngredientDTO(BaseModel):
    """Recipe ingredient data transfer object."""

    name: str
    quantity: float | None = None


class RecipeDTO(BaseModel):
    """Recipe data transfer object."""

    id: str
    name: str
    description: str | None
    instructions: str | None = None
    prep_time_minutes: int | None
    cook_time_minutes: int | None = None
    total_calories: int | None
    dietary_tags: list[str] = []
    macros: dict = {}
    ingredients: list[RecipeIngredientDTO] = []


class MealDTO(BaseModel):
    """Meal data transfer object."""

    id: str
    eat_date: str
    meal_type: str
    recipe: RecipeDTO


class MealPlanResponse(BaseModel):
    """Meal plan response model."""

    id: str
    name: str
    start_date: str
    end_date: str
    status: str
    meals: list[MealDTO]


class SaveMenuFromChatRequest(BaseModel):
    """Save menu from chat request model."""

    chat_message_id: str
    modified_draft: dict | None = None


class SaveMenuShoppingItem(BaseModel):
    """Save menu shopping item data transfer object."""

    name: str
    category: str | None = None
    quantity: str


class SaveMenuFromChatResponse(BaseModel):
    """Save menu from chat response model."""

    status: str
    meal_plan_id: str | None = None
    shopping_list: list[SaveMenuShoppingItem] = []


class UpdateCurrentMenuRequest(BaseModel):
    """Update current menu request model."""

    name: str | None = None
    status: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    total_days: int | None = None
    total_meals: int | None = None


class DeleteCurrentMenuResponse(BaseModel):
    """Delete current menu response model."""

    status: str
    meal_plan_id: str


class MealPlanSummaryResponse(BaseModel):
    """Meal plan summary response model."""

    id: str
    name: str | None = None
    start_date: str
    end_date: str
    status: str | None = None


class UpdateMenuRequest(BaseModel):
    """Update menu request model."""

    name: str | None = None
    status: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    total_days: int | None = None
    total_meals: int | None = None


class DeleteMenuResponse(BaseModel):
    """Delete menu response model."""

    status: str
    meal_plan_id: str
