"""Recipe domain models."""

import uuid

from nutri.core.db.session import Base
from sqlalchemy import JSON, Column, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    prep_time_minutes = Column(Integer, nullable=True)
    type = Column(String, nullable=True)  # e.g., Vegetarian, Meat, Poultry
    image_url = Column(String, nullable=True)

    ingredients = Column(
        JSON, default=list
    )  # List of dicts: {"item": "Tomato", "amount": "2", "unit": "pcs"}
    instructions = Column(JSON, default=list)  # List of strings

    source_url = Column(String, nullable=True)  # If scraped from the web
