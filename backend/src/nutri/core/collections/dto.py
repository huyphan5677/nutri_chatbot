# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from pydantic import BaseModel


class CollectionDTO(BaseModel):
    """Collection data transfer object."""

    id: str
    name: str
    is_default: bool
    recipe_count: int


class CollectionListResponse(BaseModel):
    """Collection list response model."""

    collections: list[CollectionDTO]


class CreateCollectionRequest(BaseModel):
    """Create collection request model."""

    name: str


class RecipeDTO(BaseModel):
    """Recipe data transfer object."""

    id: str
    name: str
    image_url: str | None = None
    prep_time_minutes: int | None = None
    type: str | None = None


class CollectionRecipeResponse(BaseModel):
    """Collection recipe response model."""

    recipes: list[RecipeDTO]


class AddRecipeRequest(BaseModel):
    """Add recipe request model."""

    recipe_id: str
