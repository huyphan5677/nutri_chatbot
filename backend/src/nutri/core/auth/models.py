"""Auth domain models."""

import uuid

from nutri.core.db.session import Base
from sqlalchemy import (
    Column,
    DateTime,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


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

    diet_mode = Column(String, nullable=True)
    budget_level = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    family_members = relationship("FamilyMember", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
    meal_plans = relationship("MealPlan", back_populates="user")
    inventories = relationship("UserInventory", back_populates="user")
    grocery_items = relationship("GroceryItem", back_populates="user")
    shopping_orders = relationship("ShoppingOrder", back_populates="user")
