from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from nutri.core.db.session import async_session_maker
from nutri.core.onboarding.models import FamilyMember
from sqlalchemy.future import select


@tool
async def get_health_goals(*, config: RunnableConfig) -> dict:
    """Retrieves the user's and family's primary health goals from the database."""
    user_id = config.get("configurable", {}).get("user_id")
    if not user_id:
        return {"error": "Authentication required"}

    async with async_session_maker() as db:
        result = await db.execute(
            select(FamilyMember).where(FamilyMember.user_id == user_id)
        )
        members = result.scalars().all()

        goals = {}
        for idx, member in enumerate(members):
            goals[f"member_{idx + 1}_{member.name}"] = {
                "primary_goal": member.primary_goal,
                "weight_kg": float(member.weight_kg) if member.weight_kg else None,
                "age": member.age,
                "bmr": float(member.bmr) if member.bmr else None,
                "tdee": float(member.tdee) if member.tdee else None,
            }

        return goals
