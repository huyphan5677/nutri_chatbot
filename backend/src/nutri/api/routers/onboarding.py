# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import asyncio
import logging
from typing import Annotated

from fastapi import Depends, APIRouter
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from nutri.core.db.session import get_db
from nutri.api.dependencies import get_current_user
from nutri.core.auth.models import User
from nutri.core.onboarding.dto import (
    MemberResponse,
    OnboardingRequest,
    HealthProfileResponse,
    OnboardingDataResponse,
    MenuRecommendationResponse,
)
from nutri.core.onboarding.models import FamilyMember
from nutri.core.onboarding.services import (
    validate_required_member,
    recompute_user_metabolism,
    enrich_user_health_profiles,
)


router = APIRouter()
logger = logging.getLogger("nutri.api.routers.onboarding")


@router.get("", response_model=OnboardingDataResponse)
async def get_onboarding_data(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> OnboardingDataResponse:
    """Get the current user's onboarding data."""
    logger.info("get_onboarding_data | user_id=%s", current_user.id)

    result = await db.execute(
        select(FamilyMember).where(FamilyMember.user_id == current_user.id)
    )
    members_db = result.scalars().all()

    # Extract equipment from the "self" member's health_profile
    equipment: list[str] = []
    members_out: list[MemberResponse] = []

    for m in members_db:
        hp_raw = m.health_profile or {}
        if m.relationship_type == "self":
            equipment = hp_raw.get("equipment", [])

        members_out.append(
            MemberResponse(
                id=m.id,
                name=m.name,
                relationship=m.relationship_type,
                age=m.age,
                gender=m.gender,
                weight_kg=float(m.weight_kg)
                if m.weight_kg is not None
                else None,
                height_cm=float(hp_raw.get("height_cm"))
                if hp_raw.get("height_cm") is not None
                else None,
                bmr=float(m.bmr) if m.bmr is not None else None,
                tdee=float(m.tdee) if m.tdee is not None else None,
                primary_goal=m.primary_goal,
                activity_level=m.activity_level,
                health_profile=HealthProfileResponse(
                    allergies=hp_raw.get("allergies", []),
                    favorite_dishes=hp_raw.get("favorite_dishes", []),
                    conditions=hp_raw.get("conditions", []),
                ),
            )
        )

    return OnboardingDataResponse(
        diet_mode=current_user.diet_mode,
        budget_level=current_user.budget_level,
        equipment=equipment,
        members=members_out,
    )


@router.put("", response_model=OnboardingDataResponse)
async def update_onboarding_data(
    data: OnboardingRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> OnboardingDataResponse:
    """Update the user's onboarding data."""
    logger.info(
        "update_onboarding_data | user_id=%s | diet_mode=%s | members=%d",
        current_user.id,
        data.diet_mode,
        len(data.members or []),
    )
    validate_required_member(data)

    # ── 1. Update user fields ──
    if data.diet_mode is not None:
        current_user.diet_mode = data.diet_mode
    if data.budget_level is not None:
        current_user.budget_level = data.budget_level

    # ── 2. Replace all family members ──
    existing = await db.execute(
        select(FamilyMember).where(FamilyMember.user_id == current_user.id)
    )
    for old_member in existing.scalars().all():
        await db.delete(old_member)

    new_members_db: list[FamilyMember] = []
    for member_dto in data.members or []:
        hp = member_dto.health_profile
        health_data: dict = {
            "allergies": hp.allergies if hp else [],
            "favorite_dishes": hp.favorite_dishes if hp else [],
            "conditions": hp.conditions if hp else [],
        }
        if member_dto.height_cm is not None:
            health_data["height_cm"] = member_dto.height_cm
        if member_dto.relationship == "self" and data.equipment:
            health_data["equipment"] = data.equipment

        new_member = FamilyMember(
            user_id=current_user.id,
            name=member_dto.name or current_user.full_name or "Me",
            relationship_type=member_dto.relationship or "self",
            gender=member_dto.gender,
            age=member_dto.age,
            weight_kg=member_dto.weight_kg,
            bmr=member_dto.bmr,
            tdee=member_dto.tdee,
            primary_goal=member_dto.primary_goal,
            activity_level=member_dto.activity_level,
            health_profile=health_data,
        )
        db.add(new_member)
        new_members_db.append(new_member)

    await db.commit()
    await db.refresh(current_user)
    asyncio.create_task(recompute_user_metabolism(current_user.id))
    asyncio.create_task(enrich_user_health_profiles(current_user.id))
    logger.info("update_onboarding_data done | user_id=%s", current_user.id)

    # ── 3. Re-fetch to return saved data with generated IDs ──
    result = await db.execute(
        select(FamilyMember).where(FamilyMember.user_id == current_user.id)
    )
    saved_members = result.scalars().all()

    equipment_out: list[str] = []
    members_out: list[MemberResponse] = []
    for m in saved_members:
        hp_raw = m.health_profile or {}
        if m.relationship_type == "self":
            equipment_out = hp_raw.get("equipment", [])
        members_out.append(
            MemberResponse(
                id=m.id,
                name=m.name,
                relationship=m.relationship_type,
                age=m.age,
                gender=m.gender,
                weight_kg=float(m.weight_kg)
                if m.weight_kg is not None
                else None,
                height_cm=float(hp_raw.get("height_cm"))
                if hp_raw.get("height_cm") is not None
                else None,
                bmr=float(m.bmr) if m.bmr is not None else None,
                tdee=float(m.tdee) if m.tdee is not None else None,
                primary_goal=m.primary_goal,
                activity_level=m.activity_level,
                health_profile=HealthProfileResponse(
                    allergies=hp_raw.get("allergies", []),
                    favorite_dishes=hp_raw.get("favorite_dishes", []),
                    conditions=hp_raw.get("conditions", []),
                ),
            )
        )

    return OnboardingDataResponse(
        diet_mode=current_user.diet_mode,
        budget_level=current_user.budget_level,
        equipment=equipment_out,
        members=members_out,
    )


@router.post("", response_model=MenuRecommendationResponse)
async def submit_onboarding_quiz(
    data: OnboardingRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MenuRecommendationResponse:
    """Submit the onboarding quiz and generate a menu recommendation."""
    logger.info(
        "submit_onboarding_quiz | user_id=%s | diet_mode=%s | members=%d",
        current_user.id,
        data.diet_mode,
        len(data.members or []),
    )
    validate_required_member(data)
    # ── 1. Update users table ──
    current_user.diet_mode = data.diet_mode or "balanced"
    if data.budget_level:
        current_user.budget_level = data.budget_level

    # ── 2. Upsert family_members table ──
    existing = await db.execute(
        select(FamilyMember).where(FamilyMember.user_id == current_user.id)
    )
    for old_member in existing.scalars().all():
        await db.delete(old_member)

    for member_dto in data.members or []:
        hp = member_dto.health_profile
        health_data = {
            "allergies": hp.allergies if hp else [],
            "favorite_dishes": hp.favorite_dishes if hp else [],
            "conditions": hp.conditions if hp else [],
        }
        if member_dto.height_cm is not None:
            health_data["height_cm"] = member_dto.height_cm
        if member_dto.relationship == "self" and data.equipment:
            health_data["equipment"] = data.equipment

        new_member = FamilyMember(
            user_id=current_user.id,
            name=member_dto.name or current_user.full_name or "Me",
            relationship_type=member_dto.relationship or "self",
            gender=member_dto.gender,
            age=member_dto.age,
            weight_kg=member_dto.weight_kg,
            bmr=member_dto.bmr,
            tdee=member_dto.tdee,
            primary_goal=member_dto.primary_goal,
            activity_level=member_dto.activity_level,
            health_profile=health_data,
        )
        db.add(new_member)

    await db.commit()
    asyncio.create_task(recompute_user_metabolism(current_user.id))
    asyncio.create_task(enrich_user_health_profiles(current_user.id))
    logger.info("submit_onboarding_quiz done | user_id=%s", current_user.id)

    menu_preview = [
        {
            "day": "Monday",
            "lunch": "Chicken Salad",
            "dinner": "Pasta Carbonara",
        },
        {"day": "Tuesday", "lunch": "Tuna Sandwich", "dinner": "Steak & Fries"},
    ]
    return {
        "message": "Preferences saved! Menu generated.",
        "menu_preview": menu_preview,
    }
