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
