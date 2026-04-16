# Copyright (c) 2026 Nutri. All rights reserved.

"""Auth domain models."""

from __future__ import annotations

import uuid

from sqlalchemy import (
    Column,
    String,
    DateTime,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID

from nutri.core.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)
    full_name = Column(String)
    status = Column(String, default="active")

    auth_provider = Column(String, nullable=True)
    auth_provider_id = Column(String, nullable=True)
    preferred_language = Column(String, nullable=False, default="en")
    preferred_theme = Column(String, nullable=False, default="light")

    diet_mode = Column(String, nullable=True)
    budget_level = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    family_members = relationship(
        "FamilyMember", back_populates="user", cascade="all, delete-orphan"
    )
    chat_sessions = relationship(
        "ChatSession", back_populates="user", cascade="all, delete-orphan"
    )
    meal_plans = relationship(
        "MealPlan", back_populates="user", cascade="all, delete-orphan"
    )
    inventories = relationship(
        "UserInventory", back_populates="user", cascade="all, delete-orphan"
    )
    grocery_items = relationship(
        "GroceryItem", back_populates="user", cascade="all, delete-orphan"
    )
    shopping_orders = relationship(
        "ShoppingOrder", back_populates="user", cascade="all, delete-orphan"
    )
    recipe_collections = relationship(
        "RecipeCollection", back_populates="user", cascade="all, delete-orphan"
    )
