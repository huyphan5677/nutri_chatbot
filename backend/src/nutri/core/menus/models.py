"""Menus domain models."""

import uuid

from nutri.core.db.session import Base
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text)
    instructions = Column(Text)
    prep_time_minutes = Column(Integer)
    cook_time_minutes = Column(Integer)
    total_calories = Column(Integer)
    type = Column(String)  # e.g., Vegetarian, Meat, Poultry
    image_url = Column(String)
    source_url = Column(String)  # If scraped from the web

    macros = Column(JSON, default=dict)
    dietary_tags = Column(JSON, default=list)

    ingredients = relationship("RecipeIngredient", back_populates="recipe", lazy="selectin")
    meals = relationship("Meal", back_populates="recipe")


class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    category = Column(String)
    base_unit = Column(String)

    recipe_links = relationship("RecipeIngredient", back_populates="ingredient")
    user_inventories = relationship("UserInventory", back_populates="ingredient")
    grocery_links = relationship("GroceryItem", back_populates="ingredient")


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipe_id = Column(UUID(as_uuid=True), ForeignKey("recipes.id"), nullable=False)
    ingredient_id = Column(
        UUID(as_uuid=True), ForeignKey("ingredients.id"), nullable=False
    )
    quantity = Column(Numeric)

    recipe = relationship("Recipe", back_populates="ingredients")
    ingredient = relationship("Ingredient", back_populates="recipe_links", lazy="joined")


class MealPlan(Base):
    __tablename__ = "meal_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String)
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(String)
    custom_prompt = Column(Text)
    ai_context_summary = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="meal_plans")
    meals = relationship(
        "Meal", back_populates="meal_plan", cascade="all, delete-orphan"
    )
    grocery_items = relationship("GroceryItem", back_populates="meal_plan")
    shopping_orders = relationship("ShoppingOrder", back_populates="meal_plan")


class Meal(Base):
    __tablename__ = "meals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meal_plan_id = Column(
        UUID(as_uuid=True), ForeignKey("meal_plans.id"), nullable=False
    )
    recipe_id = Column(UUID(as_uuid=True), ForeignKey("recipes.id"), nullable=False)
    eat_date = Column(Date)
    meal_type = Column(String)
    servings = Column(Integer)
    adjusted_instructions = Column(Text)

    meal_plan = relationship("MealPlan", back_populates="meals")
    recipe = relationship("Recipe", back_populates="meals")


class RecipeCollection(Base):
    __tablename__ = "recipe_collections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    collection_recipes = relationship(
        "CollectionRecipe", back_populates="collection", cascade="all, delete-orphan"
    )


class CollectionRecipe(Base):
    __tablename__ = "collection_recipes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    collection_id = Column(
        UUID(as_uuid=True), ForeignKey("recipe_collections.id"), nullable=False
    )
    recipe_id = Column(UUID(as_uuid=True), ForeignKey("recipes.id"), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    collection = relationship("RecipeCollection", back_populates="collection_recipes")
    recipe = relationship("Recipe")
