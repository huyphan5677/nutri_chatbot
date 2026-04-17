# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from pydantic import BaseModel


class AchievementDTO(BaseModel):
    """Achievement data transfer object."""

    id: str
    points: str
    unlocked: bool


class RewardsDTO(BaseModel):
    """Rewards data transfer object."""

    currentPoints: int
    nextTierPoints: int
    tierName: str
    progress: float
    achievements: list[AchievementDTO]


class CollectionDTO(BaseModel):
    """Collection data transfer object."""

    id: int
    name: str
    image_url: str | None
    recipe_count: int


class PersonalRecipeDTO(BaseModel):
    """Personal recipe data transfer object."""

    id: int
    title: str
    image_url: str | None
