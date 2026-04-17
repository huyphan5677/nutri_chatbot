# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from typing import Literal

from pydantic import Field, BaseModel


class EditDishRequest(BaseModel):
    """Edit dish request model."""

    action: Literal["swap", "add"] = Field(
        description="'swap' to replace an existing dish, 'add' to add a new one"
    )
    meal_type: str = Field(description="breakfast, lunch, dinner, or snack")
    day_number: int = Field(ge=1, description="1-indexed day number")
    custom_prompt: str = Field(
        min_length=1, description="User's request text, e.g. 'Đổi thành cá kho'"
    )
    original_dish_name: str | None = Field(
        default=None, description="Name of the dish being replaced (swap only)"
    )
    current_menu_summary: str = Field(
        default="",
        description="Summary of all dishes in the current menu to avoid duplication",
    )


class EditDishMealResponse(BaseModel):
    """Serialized meal data matching the draft format."""

    name: str
    description: str | None = None
    instructions: list[str] = []
    per_person_breakdown: list[str] = []
    adjustment_tips: list[str] = []
    why: str | None = None
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    calories: int = 0
    protein_grams: int = 0
    carbs_grams: int = 0
    fat_grams: int = 0
    fiber_grams: int = 0
    dietary_tags: list[str] = []
    ingredients: list[str] = []
    meal_type: str = ""
    servings: int | None = 1


class EditDishResponse(BaseModel):
    """Edit dish response model."""

    status: str
    action: str
    meal: EditDishMealResponse | None = None
    error: str | None = None
