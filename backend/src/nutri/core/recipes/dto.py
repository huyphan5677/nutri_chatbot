from typing import List, Optional

from nutri.core.recipes.entities import RecipeRead
from pydantic import BaseModel


class RecipeUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    total_calories: Optional[int] = None
    type: Optional[str] = None
    image_url: Optional[str] = None
    instructions: Optional[str] = None
    source_url: Optional[str] = None


class RecipeSearchResponse(BaseModel):
    recipes: List[RecipeRead]
    total: int
