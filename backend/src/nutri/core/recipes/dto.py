# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from pydantic import BaseModel

from nutri.core.recipes.entities import RecipeRead


class RecipeUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    total_calories: int | None = None
    type: str | None = None
    image_url: str | None = None
    instructions: str | None = None
    source_url: str | None = None


class RecipeSearchResponse(BaseModel):
    recipes: list[RecipeRead]
    total: int
