from typing import List, Optional

from pydantic import BaseModel


class RecipeIngredientDTO(BaseModel):
    name: str
    quantity: Optional[float] = None


class RecipeDTO(BaseModel):
    id: str
    name: str
    description: Optional[str]
    instructions: Optional[str] = None
    prep_time_minutes: Optional[int]
    cook_time_minutes: Optional[int] = None
    total_calories: Optional[int]
    dietary_tags: List[str] = []
    macros: dict = {}
    ingredients: List[RecipeIngredientDTO] = []


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
    meals: List[MealDTO]


class SaveMenuFromChatRequest(BaseModel):
    chat_message_id: str


class SaveMenuShoppingItem(BaseModel):
    name: str
    category: Optional[str] = None
    quantity: str


class SaveMenuFromChatResponse(BaseModel):
    status: str
    meal_plan_id: Optional[str] = None
    shopping_list: list[SaveMenuShoppingItem] = []


class UpdateCurrentMenuRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    total_days: Optional[int] = None
    total_meals: Optional[int] = None


class DeleteCurrentMenuResponse(BaseModel):
    status: str
    meal_plan_id: str


class MealPlanSummaryResponse(BaseModel):
    id: str
    name: Optional[str] = None
    start_date: str
    end_date: str
    status: Optional[str] = None


class UpdateMenuRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    total_days: Optional[int] = None
    total_meals: Optional[int] = None


class DeleteMenuResponse(BaseModel):
    status: str
    meal_plan_id: str
