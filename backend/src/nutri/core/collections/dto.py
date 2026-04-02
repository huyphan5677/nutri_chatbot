from typing import List, Optional

from pydantic import BaseModel


class CollectionDTO(BaseModel):
    id: str
    name: str
    is_default: bool
    recipe_count: int


class CollectionListResponse(BaseModel):
    collections: List[CollectionDTO]


class CreateCollectionRequest(BaseModel):
    name: str


class RecipeDTO(BaseModel):
    id: str
    name: str
    image_url: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    type: Optional[str] = None


class CollectionRecipeResponse(BaseModel):
    recipes: List[RecipeDTO]


class AddRecipeRequest(BaseModel):
    recipe_id: str
