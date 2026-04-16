# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, APIRouter
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from nutri.core.db.session import get_db
from nutri.api.dependencies import get_current_user
from nutri.core.auth.models import User
from nutri.core.profile.dto import (
    RewardsDTO,
    CollectionDTO,
    AchievementDTO,
    PersonalRecipeDTO,
)
from nutri.core.menus.models import MealPlan
from nutri.core.grocery.models import UserInventory


router = APIRouter()


@router.get("/collections", response_model=list[CollectionDTO])
async def get_user_collections(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[CollectionDTO]:
    """Get all collections for the current user."""
    return []


@router.get("/personal-recipes", response_model=list[PersonalRecipeDTO])
async def get_user_personal_recipes(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[PersonalRecipeDTO]:
    """Get all personal recipes for the current user."""
    return []


@router.get("/rewards", response_model=RewardsDTO)
async def get_user_rewards(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> RewardsDTO:
    """Dynamically calculate user's reward points and achievements."""
    # Execute SQL counting distinct ingredient ids for Pantry Master achievement
    inv_result = await db.execute(
        select(func.count(func.distinct(UserInventory.ingredient_id))).where(
            UserInventory.user_id == current_user.id
        )
    )
    inv_count = inv_result.scalar() or 0

    # Count generated meal plans
    meal_result = await db.execute(
        select(func.count(MealPlan.id)).where(
            MealPlan.user_id == current_user.id
        )
    )
    meal_count = meal_result.scalar() or 0

    # Calculate Score
    points = (inv_count * 10) + (meal_count * 100)

    pantry_unlocked = inv_count >= 50
    planner_unlocked = meal_count >= 4
    if pantry_unlocked:
        points += 50
    if planner_unlocked:
        points += 100

    tier_name = "Bronze Chef"
    next_tier_pts = 1000
    if points >= 2000:
        tier_name = "Gold Chef"
        next_tier_pts = max(3000, points + 1000)
    elif points >= 1000:
        tier_name = "Silver Chef"
        next_tier_pts = 2000

    progress = min(100.0, (points / next_tier_pts) * 100)

    achievements = [
        AchievementDTO(
            id="pantryMaster", points="+50", unlocked=pantry_unlocked
        ),
        AchievementDTO(
            id="consistentPlanner", points="+100", unlocked=planner_unlocked
        ),
    ]

    return RewardsDTO(
        currentPoints=points,
        nextTierPoints=next_tier_pts,
        tierName=tier_name,
        progress=progress,
        achievements=achievements,
    )
