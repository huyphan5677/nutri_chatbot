# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.future import select

from nutri.core.db.session import async_session_maker
from nutri.core.onboarding.models import FamilyMember


if TYPE_CHECKING:
    from nutri.core.onboarding.dto import OnboardingRequest


router = APIRouter()
logger = logging.getLogger("nutri.api.routers.onboarding")


def validate_required_member(data: OnboardingRequest) -> None:
    """Validate that the first member.

    Args:
        data: Onboarding request data.

    Raises:
        HTTPException: If the first member is missing required fields.
    """
    members = data.members or []
    if not members:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Need at least 1 member in onboarding.",
        )

    member = members[0]
    missing_fields: list[str] = []

    if not (member.name or "").strip():
        missing_fields.append("name")
    if not (member.relationship or "").strip():
        missing_fields.append("relationship")
    if not (member.gender or "").strip():
        missing_fields.append("gender")
    if member.age is None or member.age <= 0:
        missing_fields.append("age")
    if member.weight_kg is None or member.weight_kg <= 0:
        missing_fields.append("weight_kg")
    if member.height_cm is None or member.height_cm <= 0:
        missing_fields.append("height_cm")

    if missing_fields:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Member 1 is missing required fields.",
                "fields": missing_fields,
            },
        )


def activity_multiplier(activity_level: str | None) -> float:
    """Convert activity level string to multiplier for TDEE calculation."""
    if not activity_level:
        return 1.2
    mapping = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9,
    }
    return mapping.get(activity_level.lower(), 1.2)


def calculate_member_bmr_tdee(
    member: FamilyMember,
) -> tuple[float, float] | None:
    """Calculate BMR and TDEE for a family member."""
    if (
        member.weight_kg is None
        or member.age is None
        or member.age <= 0
        or not member.gender
    ):
        return None

    health_profile = member.health_profile or {}
    height = health_profile.get("height_cm")
    if height is None:
        return None

    weight = float(member.weight_kg)
    height_cm = float(height)
    age = int(member.age)
    gender = member.gender.strip().lower()

    if gender == "male":
        bmr = 10 * weight + 6.25 * height_cm - 5 * age + 5
    elif gender == "female":
        bmr = 10 * weight + 6.25 * height_cm - 5 * age - 161
    else:
        bmr_male = 10 * weight + 6.25 * height_cm - 5 * age + 5
        bmr_female = 10 * weight + 6.25 * height_cm - 5 * age - 161
        bmr = (bmr_male + bmr_female) / 2

    tdee = bmr * activity_multiplier(member.activity_level)
    return round(bmr, 2), round(tdee, 2)


async def recompute_user_metabolism(user_id):
    """Recompute BMR and TDEE for all family members of the user.

    This is called asynchronously after onboarding updates.
    """
    async with async_session_maker() as db:
        result = await db.execute(
            select(FamilyMember).where(FamilyMember.user_id == user_id)
        )
        members = result.scalars().all()

        changed = False
        for member in members:
            metrics = calculate_member_bmr_tdee(member)
            if not metrics:
                continue
            bmr, tdee = metrics
            member.bmr = round(bmr, 2)
            member.tdee = round(tdee, 2)
            changed = True

        if changed:
            await db.commit()


async def enrich_user_health_profiles(user_id) -> None:
    """Enrich health profiles.

    Args:
        user_id: User ID.
    """
    from nutri.ai.agents.enrich_metadata_agent import EnrichMetadataAgent

    logger.info("enrich_user_health_profiles START | user_id=%s", user_id)

    try:
        agent = EnrichMetadataAgent()

        async with async_session_maker() as db:
            result = await db.execute(
                select(FamilyMember).where(FamilyMember.user_id == user_id)
            )
            members = result.scalars().all()

            changed = False
            for member in members:
                hp = member.health_profile or {}
                conditions = hp.get("conditions", [])
                allergies = hp.get("allergies", [])

                if not conditions and not allergies:
                    logger.debug(
                        "Member '%s' has no conditions/allergies, skipping",
                        member.name,
                    )
                    continue

                # Skip if already enriched (avoid re-running on update)
                if hp.get("enriched_metadata"):
                    existing_meta = hp["enriched_metadata"]
                    existing_conditions = set(
                        existing_meta.get("conditions_metadata", {}).keys()
                    )
                    existing_allergies = set(
                        existing_meta.get("allergies_metadata", {}).keys()
                    )
                    if existing_conditions == set(
                        conditions
                    ) and existing_allergies == set(allergies):
                        logger.debug(
                            "Member '%s' already enriched with same data, skipping",
                            member.name,
                        )
                        continue

                logger.info(
                    "Enriching member '%s' | conditions=%s | allergies=%s",
                    member.name,
                    conditions,
                    allergies,
                )

                enriched = await agent.enrich_member_profile(
                    conditions, allergies
                )

                # Merge enriched data into health_profile
                updated_hp = dict(hp)
                updated_hp["enriched_metadata"] = {
                    "conditions_metadata": {
                        k: v.model_dump()
                        for k, v in enriched.conditions_metadata.items()
                    },
                    "allergies_metadata": {
                        k: v.model_dump()
                        for k, v in enriched.allergies_metadata.items()
                    },
                }
                member.health_profile = updated_hp
                changed = True

            if changed:
                await db.commit()
                logger.info(
                    "enrich_user_health_profiles DONE | user_id=%s | enriched members",
                    user_id,
                )
            else:
                logger.info(
                    "enrich_user_health_profiles DONE | user_id=%s | nothing to enrich",
                    user_id,
                )

    except Exception as e:
        logger.error(  # noqa: TRY400
            "enrich_user_health_profiles FAILED | user_id=%s | error=%s",
            user_id,
            e,
        )
