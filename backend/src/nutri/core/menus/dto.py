# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from pydantic import BaseModel


class RecipeIngredientDTO(BaseModel):
    name: str
    quantity: float | None = None


class RecipeDTO(BaseModel):
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
    id: str
    eat_date: str
    meal_type: str
    recipe: RecipeDTO


class MealPlanResponse(BaseModel):
    id: str
    name: str
    start_date: str
    end_date: str
    status: str
    meals: list[MealDTO]


class SaveMenuFromChatRequest(BaseModel):
    chat_message_id: str
    modified_draft: dict | None = None


class SaveMenuShoppingItem(BaseModel):
    name: str
    category: str | None = None
    quantity: str


class SaveMenuFromChatResponse(BaseModel):
    status: str
    meal_plan_id: str | None = None
    shopping_list: list[SaveMenuShoppingItem] = []


class UpdateCurrentMenuRequest(BaseModel):
    name: str | None = None
    status: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    total_days: int | None = None
    total_meals: int | None = None


class DeleteCurrentMenuResponse(BaseModel):
    status: str
    meal_plan_id: str


class MealPlanSummaryResponse(BaseModel):
    id: str
    name: str | None = None
    start_date: str
    end_date: str
    status: str | None = None


class UpdateMenuRequest(BaseModel):
    name: str | None = None
    status: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    total_days: int | None = None
    total_meals: int | None = None


class DeleteMenuResponse(BaseModel):
    status: str
    meal_plan_id: str
