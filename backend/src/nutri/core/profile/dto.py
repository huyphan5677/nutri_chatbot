from typing import List
from pydantic import BaseModel


class AchievementDTO(BaseModel):
    id: str
    points: str
    unlocked: bool


class RewardsDTO(BaseModel):
    currentPoints: int
    nextTierPoints: int
    tierName: str
    progress: float
    achievements: List[AchievementDTO]


class CollectionDTO(BaseModel):
    id: int
    name: str
    image_url: str | None
    recipe_count: int


class PersonalRecipeDTO(BaseModel):
    id: int
    title: str
    image_url: str | None
