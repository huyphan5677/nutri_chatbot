from typing import Literal, Optional

from pydantic import BaseModel, Field


class EditDishRequest(BaseModel):
    action: Literal["swap", "add"] = Field(
        description="'swap' to replace an existing dish, 'add' to add a new one"
    )
    meal_type: str = Field(description="breakfast, lunch, dinner, or snack")
    day_number: int = Field(ge=1, description="1-indexed day number")
    custom_prompt: str = Field(
        min_length=1, description="User's request text, e.g. 'Đổi thành cá kho'"
    )
    original_dish_name: Optional[str] = Field(
        default=None, description="Name of the dish being replaced (swap only)"
    )
    current_menu_summary: str = Field(
        default="",
        description="Summary of all dishes in the current menu to avoid duplication",
    )


class EditDishMealResponse(BaseModel):
    """Serialized meal data matching the draft format."""

    name: str
    description: Optional[str] = None
    instructions: list[str] = []
    per_person_breakdown: list[str] = []
    adjustment_tips: list[str] = []
    why: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    calories: int = 0
    protein_grams: int = 0
    carbs_grams: int = 0
    fat_grams: int = 0
    fiber_grams: int = 0
    dietary_tags: list[str] = []
    ingredients: list[str] = []
    meal_type: str = ""
    servings: Optional[int] = 1


class EditDishResponse(BaseModel):
    status: str
    action: str
    meal: Optional[EditDishMealResponse] = None
    error: Optional[str] = None
