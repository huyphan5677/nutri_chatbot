# Copyright (c) 2026 Nutri. All rights reserved.
"""Auth domain models."""

from __future__ import annotations

import uuid

from sqlalchemy import (
    JSON,
    Column,
    String,
    Integer,
    Numeric,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from nutri.core.db.session import Base


class FamilyMember(Base):
    """Family member model."""

    __tablename__ = "family_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    relationship_type = Column(String)
    age = Column(Integer, nullable=True)
    gender = Column(String)
    weight_kg = Column(Numeric, nullable=True)
    bmr = Column(Numeric, nullable=True)
    tdee = Column(Numeric, nullable=True)
    primary_goal = Column(String)
    activity_level = Column(String)

    health_profile = Column(JSON, default=dict)

    user = relationship("User", back_populates="family_members")
