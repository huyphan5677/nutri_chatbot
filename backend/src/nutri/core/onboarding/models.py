"""Auth domain models."""

import uuid

from nutri.core.db.session import Base
from sqlalchemy import (
    JSON,
    Column,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


class FamilyMember(Base):
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
