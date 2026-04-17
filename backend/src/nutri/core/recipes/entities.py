# Copyright (c) 2026 Nutri. All rights reserved.
"""Recipe schemas."""

from __future__ import annotations

import json
from uuid import UUID
from typing import Any

import pydantic
from pydantic import Field, BaseModel


class IngredientSchema(BaseModel):
    """Ingredient schema."""

    item: str
    amount: str | None = None
    unit: str | None = None


class RecipeBase(BaseModel):
    """Recipe base model."""

    name: str = Field(..., description="The name of the recipe")
    description: str | None = Field(
        None, description="A brief description of the recipe"
    )
    prep_time_minutes: int | None = Field(
        None, description="Preparation time in minutes"
    )
    cook_time_minutes: int | None = Field(
        None, description="Cooking time in minutes"
    )
    total_calories: int | None = Field(None, description="Total calories")
    type: str | None = Field(
        None,
        description="Categorization, e.g., Vegetarian, Meat, Poultry, Seafood",
    )
    image_url: str | None = Field(
        None, description="URL to an image of the recipe"
    )
    ingredients: list[Any] = Field(
        default_factory=list, description="List of ingredients"
    )
    instructions: list[str] = Field(
        default_factory=list, description="List of instruction steps"
    )
    source_url: str | None = Field(
        None, description="URL if the recipe was scraped from the web"
    )


class RecipeCreate(RecipeBase):
    """Recipe create model."""


class RecipeList(BaseModel):
    """Recipe list model."""

    recipes: list[RecipeCreate]


class RecipeRead(RecipeBase):
    """Recipe read model."""

    id: UUID

    model_config = pydantic.ConfigDict(from_attributes=True)

    @pydantic.field_validator("instructions", mode="before")
    @classmethod
    def parse_instructions(cls, v):
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass
            return [step.strip() for step in v.split("\n") if step.strip()]
        return v

    @pydantic.field_validator("ingredients", mode="before")
    @classmethod
    def parse_ingredients(cls, v):
        if isinstance(v, str):
            import json

            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                return []

        if isinstance(v, list) and len(v) > 0 and hasattr(v[0], "ingredient"):
            res = []
            for ri in v:
                amount_str = str(ri.quantity) if ri.quantity else None
                res.append({
                    "item": ri.ingredient.name if ri.ingredient else "Unknown",
                    "amount": amount_str,
                    "unit": ri.ingredient.base_unit if ri.ingredient else None,
                })
            return res

        return v
