"""Recipe schemas."""

from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field
import pydantic


class IngredientSchema(BaseModel):
    item: str
    amount: str | None = None
    unit: str | None = None


class RecipeBase(BaseModel):
    name: str = Field(..., description="The name of the recipe")
    description: Optional[str] = Field(
        None, description="A brief description of the recipe"
    )
    prep_time_minutes: Optional[int] = Field(
        None, description="Preparation time in minutes"
    )
    cook_time_minutes: Optional[int] = Field(
        None, description="Cooking time in minutes"
    )
    total_calories: Optional[int] = Field(None, description="Total calories")
    type: Optional[str] = Field(
        None, description="Categorization, e.g., Vegetarian, Meat, Poultry, Seafood"
    )
    image_url: Optional[str] = Field(None, description="URL to an image of the recipe")
    ingredients: List[Any] = Field(
        default_factory=list, description="List of ingredients"
    )
    instructions: List[str] = Field(
        default_factory=list, description="List of instruction steps"
    )
    source_url: Optional[str] = Field(
        None, description="URL if the recipe was scraped from the web"
    )


class RecipeCreate(RecipeBase):
    pass


class RecipeList(BaseModel):
    recipes: List[RecipeCreate]


class RecipeRead(RecipeBase):
    id: UUID

    class Config:
        from_attributes = True

    @pydantic.field_validator("instructions", mode="before")
    @classmethod
    def parse_instructions(cls, v):
        if isinstance(v, str):
            import json
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
                    "unit": ri.ingredient.base_unit if ri.ingredient else None
                })
            return res
            
        return v
