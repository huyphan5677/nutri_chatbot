# Copyright (c) 2026 Nutri. All rights reserved.
"""Grocery domain models."""

from __future__ import annotations

import uuid

from sqlalchemy import (
    Date,
    Column,
    String,
    Boolean,
    Numeric,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB

from nutri.core.db.session import Base


class UserInventory(Base):
    """User inventory model."""

    __tablename__ = "user_inventories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    ingredient_id = Column(
        UUID(as_uuid=True), ForeignKey("ingredients.id"), nullable=False
    )
    quantity = Column(String)
    expiration_date = Column(Date)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="inventories")
    ingredient = relationship("Ingredient", back_populates="user_inventories")


class GroceryItem(Base):
    """Grocery item model."""

    __tablename__ = "grocery_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    meal_plan_id = Column(
        UUID(as_uuid=True), ForeignKey("meal_plans.id"), nullable=True
    )
    ingredient_id = Column(
        UUID(as_uuid=True), ForeignKey("ingredients.id"), nullable=False
    )
    quantity = Column(Numeric)
    is_purchased = Column(Boolean, default=False)

    user = relationship("User", back_populates="grocery_items")
    meal_plan = relationship("MealPlan", back_populates="grocery_items")
    ingredient = relationship("Ingredient", back_populates="grocery_links")


class ShoppingOrder(Base):
    """Shopping order model."""

    __tablename__ = "shopping_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    meal_plan_id = Column(
        UUID(as_uuid=True), ForeignKey("meal_plans.id"), nullable=True
    )
    total_amount = Column(Numeric)
    currency = Column(String)
    status = Column(String)  # 'processing', 'completed', 'failed'
    strategy = Column(String)
    city = Column(String, nullable=True)
    result_data = Column(JSONB, nullable=True)
    notification_read = Column(
        Boolean, default=False, nullable=False, server_default="false"
    )
    ordered_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="shopping_orders")
    meal_plan = relationship("MealPlan", back_populates="shopping_orders")
