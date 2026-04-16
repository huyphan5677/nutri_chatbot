# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from pydantic import BaseModel


class CollectionDTO(BaseModel):
    id: str
    name: str
    is_default: bool
    recipe_count: int


class CollectionListResponse(BaseModel):
    collections: list[CollectionDTO]


class CreateCollectionRequest(BaseModel):
    name: str


class RecipeDTO(BaseModel):
    id: str
    name: str
    image_url: str | None = None
    prep_time_minutes: int | None = None
    type: str | None = None


class CollectionRecipeResponse(BaseModel):
    recipes: list[RecipeDTO]


class AddRecipeRequest(BaseModel):
    recipe_id: str
