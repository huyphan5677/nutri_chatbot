from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from nutri.ai.language import get_language_from_config
from nutri.ai.workflows.meal_plan_workflow import generate_meal_plan_draft
from nutri.core.db.session import async_session_maker
from nutri.core.onboarding.models import FamilyMember
from sqlalchemy.future import select


def _fmt_num(v):
    if v is None:
        return "N/A"
    try:
        f = float(v)
        return str(int(f)) if f.is_integer() else f"{f:.1f}"
    except Exception:
        return str(v)


async def _build_metabolic_context(user_id: str, language: str) -> str:
    async with async_session_maker() as db:
        result = await db.execute(
            select(FamilyMember).where(FamilyMember.user_id == user_id)
        )
        members = result.scalars().all()

    if not members:
        return ""

    lines = [
        "[AUTO-INJECTED METABOLIC CONTEXT - MUST USE FOR KCAL PLANNING]",
        "Use these per-member targets and constraints when composing the menu:",
        f"Target response language code: {language}",
    ]

    for idx, m in enumerate(members, start=1):
        name = m.name or f"Member {idx}"
        relation = m.relationship_type or "member"
        goal = m.primary_goal or "none"
        activity = m.activity_level or "unknown"
        bmr = _fmt_num(m.bmr)
        tdee = _fmt_num(m.tdee)
        weight = _fmt_num(m.weight_kg)
        age = str(m.age) if m.age is not None else "N/A"
        hp = m.health_profile or {}
        allergies = hp.get("allergies", []) if isinstance(hp, dict) else []
        conditions = hp.get("conditions", []) if isinstance(hp, dict) else []

        lines.append(
            f"- {name} ({relation}): age={age}, weight_kg={weight}, goal={goal}, "
            f"activity={activity}, BMR={bmr} kcal, TDEE={tdee} kcal, "
            f"allergies={allergies}, conditions={conditions}"
        )

    lines.append(
        "If TDEE is available, anchor daily kcal planning around TDEE and goal."
    )
    return "\n".join(lines)


@tool
async def create_meal_plan(
    total_days: int, custom_prompt: str = "", *, config: RunnableConfig
) -> dict:
    """
    Activates the deep workflow to generate a meal plan draft for the user (1-7 days).
    Use this whenever the user asks for a menu/thuc don, including single-day requests
    like tonight/today (use total_days=1 and include constraints via custom_prompt).
    """
    language = get_language_from_config(config)
    user_id = config.get("configurable", {}).get("user_id")
    if not user_id:
        return "Authentication required to generate meal plans. Please ask the user to log in."

    metabolic_context = await _build_metabolic_context(user_id, language)
    effective_prompt = custom_prompt.strip()
    if metabolic_context:
        effective_prompt = (
            f"{effective_prompt}\n\n{metabolic_context}"
            if effective_prompt
            else metabolic_context
        )

    draft_payload = await generate_meal_plan_draft(
        user_id=user_id,
        total_days=total_days,
        custom_prompt=effective_prompt,
    )
    if draft_payload.get("error"):
        return {
            "summary": "Sorry, I could not generate a menu draft right now.",
            "meal_plan_draft": None,
        }

    summary_prefix = (
        f"I have generated a {total_days}-day meal plan draft. "
        "Please show it clearly to the user, in their language, and mention they can press 'Save menu' to persist it.\n"
        f"Target response language code: {language}\n"
    )

    return {
        "summary": f"{summary_prefix}{draft_payload.get('summary_markdown', '')}",
        "meal_plan_draft": draft_payload,
    }
