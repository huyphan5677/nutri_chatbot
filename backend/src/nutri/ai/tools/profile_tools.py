import logging

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from nutri.ai.language import get_language_from_config
from nutri.core.auth.models import User
from nutri.core.db.session import async_session_maker
from nutri.core.onboarding.models import FamilyMember
from sqlalchemy.future import select

logger = logging.getLogger("nutri.ai.tools.profile_tools")


@tool
async def get_user_profile(section: str = "all", *, config: RunnableConfig) -> str:
    """
    Retrieve the current user's profile information setup during onboarding.
    Args:
        section: Which part of the profile to retrieve (e.g. 'all', 'biometrics', 'dietary_preferences', 'allergies').
    """
    language = get_language_from_config(config)
    user_id = config.get("configurable", {}).get("user_id")
    if not user_id:
        return "Authentication required to view profile."

    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if not user:
            return "User profile not found in database."

        result = await db.execute(
            select(FamilyMember).where(FamilyMember.user_id == user.id)
        )
        members = result.scalars().all()

        profile_context = "User Account Settings:\n"
        profile_context += f"- Diet Mode: {user.diet_mode or 'None'}\n"
        profile_context += f"- Budget Level: {user.budget_level or 'None'}\n"
        profile_context += f"- Target response language code: {language}\n\n"

        profile_context += "Family Members & Kitchen Setup:\n"
        for idx, member in enumerate(members):
            profile_context += f"Member {idx + 1} ({member.relationship_type}):\n"
            profile_context += f"  - Name: {member.name}\n"
            profile_context += f"  - Gender: {member.gender or 'None'}\n"
            profile_context += f"  - Age: {member.age or 'N/A'}\n"
            profile_context += (
                f"  - Goals: {member.primary_goal or 'None'} "
                f"(Current Weight: {member.weight_kg or 'N/A'}kg)\n"
            )
            profile_context += (
                f"  - Activity Level: {member.activity_level or 'None'}\n"
            )
            profile_context += (
                "  - Metabolic Metrics: "
                f"BMR={member.bmr or 'N/A'} kcal, TDEE={member.tdee or 'N/A'} kcal\n"
            )
            profile_context += (
                f"  - Health Profile/Allergies: {member.health_profile or 'None'}\n\n"
            )

        return profile_context


@tool
async def update_user_profile(
    category: str, value: str, severity: str = "none", *, config: RunnableConfig
) -> str:
    """
    Add or update a user profile attribute (e.g. adding a new allergy or health condition).
    Args:
        category: The attribute category ('allergy', 'health_condition', 'goal', etc)
        value: The specific value (e.g., 'Dairy', 'Diabetes', 'Lose 5kg')
        severity: (Optional) The severity of the condition or allergy.
    """
    language = get_language_from_config(config)
    user_id = config.get("configurable", {}).get("user_id")
    if not user_id:
        return "Authentication required to update profile."

    async with async_session_maker() as db:
        # Update primary family member (assuming the first one for current context)
        result = await db.execute(
            select(FamilyMember).where(FamilyMember.user_id == user_id)
        )
        member = result.scalars().first()
        if not member:
            return "User profile not found in database."

        health_profile = member.health_profile or {}
        if category not in health_profile:
            health_profile[category] = []

        # Append logic avoiding duplicates
        existing_values = [
            item
            for item in health_profile[category]
            if isinstance(item, dict) and item.get("value") == value
        ]
        if not existing_values:
            health_profile[category].append({"value": value, "severity": severity})

        # SQLAlchemy JSON mutation tracking (sometimes needs reassignment)
        member.health_profile = dict(health_profile)
        await db.commit()

    return (
        f"Successfully added {category}: {value} (Severity: {severity}) to user profile in database. "
        f"Target response language code: {language}."
    )
