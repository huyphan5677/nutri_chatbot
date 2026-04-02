import ast
import asyncio
import datetime
import logging
import re
import uuid

from nutri.ai.agents.meal_plan_agent import MealPlanAgent
from nutri.ai.workflows.grocery_workflow import generate_grocery_list_background
from nutri.core.auth.models import User
from nutri.core.db.session import async_session_maker
from nutri.core.menus.models import Ingredient, Meal, MealPlan, Recipe, RecipeIngredient
from nutri.core.onboarding.models import FamilyMember
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

logger = logging.getLogger("nutri.ai.workflows.meal_plan")


def _parse_number(val) -> int:
    """Parse a number from a string or return the number itself."""
    if val is None:
        return 0
    if isinstance(val, (int, float)):
        return int(val)
    match = re.search(r"\d+", str(val))
    if match:
        return int(match.group())
    return 0


def _extract_quantity_grams(raw_value) -> float | None:
    """Extract grams from mixed quantity formats; return None when unknown."""
    if raw_value is None:
        return None
    if isinstance(raw_value, (int, float)):
        return float(raw_value)

    text = str(raw_value).strip().lower().replace(",", ".")

    # Prefer explicit weight units for stable conversion to grams.
    weight_match = re.search(
        r"(\d+(?:\.\d+)?)\s*(kg|kgs|kilogram|kilograms|g|gr|gram|grams)\b", text
    )
    if weight_match:
        value = float(weight_match.group(1))
        unit = weight_match.group(2)
        if unit.startswith("kg") or unit.startswith("kilo"):
            return value * 1000
        return value

    # If no known weight unit exists, avoid forcing a fake grams value.
    return None


def _serialize_generated_meal(generated_meal) -> dict:
    return {
        "name": generated_meal.name,
        "description": generated_meal.description,
        "instructions": generated_meal.instructions,
        "per_person_breakdown": generated_meal.per_person_breakdown,
        "adjustment_tips": generated_meal.adjustment_tips,
        "why": generated_meal.why,
        "prep_time_minutes": generated_meal.prep_time_minutes,
        "cook_time_minutes": generated_meal.cook_time_minutes,
        "calories": _parse_number(generated_meal.calories),
        "protein_grams": _parse_number(generated_meal.protein_grams),
        "carbs_grams": _parse_number(generated_meal.carbs_grams),
        "fat_grams": _parse_number(generated_meal.fat_grams),
        "fiber_grams": _parse_number(generated_meal.fiber_grams),
        "dietary_tags": generated_meal.dietary_tags,
        "ingredients": generated_meal.ingredients,
        "meal_type": generated_meal.meal_type,
        "servings": generated_meal.servings,
    }


def _parse_ingredient_entry(raw_ingredient) -> tuple[str, float | None]:
    """Parse ingredient payloads that may be plain text or dict-like strings."""
    parsed = None

    if isinstance(raw_ingredient, dict):
        parsed = raw_ingredient
    elif isinstance(raw_ingredient, str):
        candidate = raw_ingredient.strip()
        if candidate.startswith("{") and candidate.endswith("}"):
            try:
                maybe = ast.literal_eval(candidate)
                if isinstance(maybe, dict):
                    parsed = maybe
            except Exception:
                parsed = None

    if isinstance(parsed, dict):
        name = (
            parsed.get("name")
            or parsed.get("item")
            or parsed.get("ingredient")
            or "Unknown ingredient"
        )
        quantity_raw = (
            parsed.get("grams")
            or parsed.get("gram_weight")
            or parsed.get("quantity")
            or parsed.get("qty")
        )
        quantity = _extract_quantity_grams(quantity_raw)
        clean_name = str(name).strip()
        return clean_name, quantity

    raw_text = str(raw_ingredient).strip()

    # Common pattern: "200g chicken breast" or "1.5 kg rice"
    leading_weight = re.match(
        r"^\s*(\d+(?:[\.,]\d+)?)\s*(kg|kgs|kilogram|kilograms|g|gr|gram|grams)\b[\s:-]*(.+)$",
        raw_text,
        flags=re.IGNORECASE,
    )
    if leading_weight:
        value = float(leading_weight.group(1).replace(",", "."))
        unit = leading_weight.group(2).lower()
        grams = (
            value * 1000 if unit.startswith("kg") or unit.startswith("kilo") else value
        )
        name_part = leading_weight.group(3).strip() or raw_text
        return name_part, grams

    # Common pattern: "Chicken breast: 200g"
    trailing_weight = re.match(
        r"^\s*(.+?)\s*[:\-]\s*(\d+(?:[\.,]\d+)?)\s*(kg|kgs|kilogram|kilograms|g|gr|gram|grams)\s*$",
        raw_text,
        flags=re.IGNORECASE,
    )
    if trailing_weight:
        name_part = trailing_weight.group(1).strip() or raw_text
        value = float(trailing_weight.group(2).replace(",", "."))
        unit = trailing_weight.group(3).lower()
        grams = (
            value * 1000 if unit.startswith("kg") or unit.startswith("kilo") else value
        )
        return name_part, grams

    return raw_text, None


async def _load_user_profile_context(db: AsyncSession, user_id: str):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        return None, None

    result = await db.execute(
        select(FamilyMember).where(FamilyMember.user_id == user.id)
    )
    members = result.scalars().all()

    profile_context = f"Diet Mode: {user.diet_mode}\n"
    profile_context += f"Budget Level: {user.budget_level}\n"
    for idx, member in enumerate(members):
        hp = member.health_profile or {}
        allergies = hp.get("allergies", []) if isinstance(hp, dict) else []
        conditions = hp.get("conditions", []) if isinstance(hp, dict) else []
        height_cm = hp.get("height_cm") if isinstance(hp, dict) else None

        profile_context += (
            f"Member {idx + 1} ({member.relationship_type}): "
            f"name={member.name}, gender={member.gender}, age={member.age}, "
            f"weight_kg={member.weight_kg}, height_cm={height_cm}, "
            f"goal={member.primary_goal}, activity={member.activity_level}, "
            f"BMR={member.bmr}, TDEE={member.tdee}, "
            f"allergies={allergies}, conditions={conditions}\n"
        )

    return user, profile_context


async def generate_meal_plan_draft(
    user_id: str, total_days: int, custom_prompt: str = ""
):
    """Generate meal plan draft payload without persisting to meal tables."""

    async with async_session_maker() as db:
        user, profile_context = await _load_user_profile_context(db, user_id)
        if not user:
            logger.error("Workflow Error: User %s not found.", user_id)
            return {"error": "User not found"}

        agent = MealPlanAgent()
        previous_days_context = ""
        draft_days = []

        for day in range(1, total_days + 1):
            logger.info(
                "Generating Day %d/%d draft for user %s...", day, total_days, user.id
            )

            day_data = await agent.agenerate_for_day(
                user_profile_context=profile_context,
                day_number=day,
                total_days=total_days,
                previous_days_context=previous_days_context,
                custom_prompt=custom_prompt,
            )

            eat_date = datetime.date.today() + datetime.timedelta(days=day - 1)
            serialized_meals = [_serialize_generated_meal(m) for m in day_data.meals]

            daily_summary = []
            for m in serialized_meals:
                ingredients_str = (
                    ", ".join(m["ingredients"])
                    if m["ingredients"]
                    else "No ingredients listed"
                )
                why_text = f" | Why: {m.get('why')}" if m.get("why") else ""
                daily_summary.append(
                    f"**{m['meal_type']}**: {m['name']} (Ingredients: {ingredients_str}){why_text}"
                )

            if day_data.daily_summary_lines:
                daily_summary.extend(day_data.daily_summary_lines)
            if day_data.gap_fix:
                daily_summary.append(f"Gap fix: {day_data.gap_fix}")

            previous_days_context += (
                f"**{day_data.day_header or f'Day {day}'}**\n"
                + "\n".join([f"- {s}" for s in daily_summary])
                + "\n\n"
            )

            draft_days.append(
                {
                    "day_number": day,
                    "eat_date": str(eat_date),
                    "day_header": day_data.day_header,
                    "daily_summary_lines": day_data.daily_summary_lines,
                    "gap_fix": day_data.gap_fix,
                    "meals": serialized_meals,
                }
            )

        return {
            "draft_id": str(uuid.uuid4()),
            "total_days": total_days,
            "custom_prompt": custom_prompt,
            "name": f"Menu {datetime.date.today().strftime('%b %d')}",
            "start_date": str(datetime.date.today()),
            "end_date": str(
                datetime.date.today() + datetime.timedelta(days=total_days - 1)
            ),
            "ai_context_summary": {"profile": profile_context},
            "summary_markdown": previous_days_context,
            "days": draft_days,
            "created_at": datetime.datetime.utcnow().isoformat(),
            "saved": False,
        }


async def persist_meal_plan_from_draft(
    db: AsyncSession,
    user_id: str,
    draft_payload: dict,
    wait_for_grocery: bool = False,
):
    """Persist a draft payload into meal tables and trigger grocery generation."""

    meal_plan = MealPlan(
        user_id=user_id,
        name=draft_payload.get("name")
        or f"Menu {datetime.date.today().strftime('%b %d')}",
        start_date=datetime.date.fromisoformat(draft_payload["start_date"]),
        end_date=datetime.date.fromisoformat(draft_payload["end_date"]),
        status="generating",
        custom_prompt=draft_payload.get("custom_prompt") or "",
        ai_context_summary=draft_payload.get("ai_context_summary") or {},
    )
    db.add(meal_plan)
    await db.flush()

    for day in draft_payload.get("days", []):
        eat_date = datetime.date.fromisoformat(day["eat_date"])
        for generated_meal in day.get("meals", []):
            recipe = Recipe(
                name=generated_meal.get("name"),
                description=generated_meal.get("description"),
                instructions="\n".join(generated_meal.get("instructions") or []),
                prep_time_minutes=generated_meal.get("prep_time_minutes"),
                cook_time_minutes=generated_meal.get("cook_time_minutes"),
                total_calories=_parse_number(generated_meal.get("calories")),
                macros={
                    "protein": _parse_number(generated_meal.get("protein_grams")),
                    "carbs": _parse_number(generated_meal.get("carbs_grams")),
                    "fat": _parse_number(generated_meal.get("fat_grams")),
                    "fiber": _parse_number(generated_meal.get("fiber_grams")),
                },
                dietary_tags=generated_meal.get("dietary_tags") or [],
            )
            db.add(recipe)
            await db.flush()

            for ing in generated_meal.get("ingredients") or []:
                ingredient_name, ingredient_qty = _parse_ingredient_entry(ing)
                existing_ing_result = await db.execute(
                    select(Ingredient).where(Ingredient.name.ilike(ingredient_name))
                )
                ingredient = existing_ing_result.scalars().first()
                if not ingredient:
                    ingredient = Ingredient(name=ingredient_name)
                    db.add(ingredient)
                    await db.flush()

                recipe_ing = RecipeIngredient(
                    recipe_id=recipe.id,
                    ingredient_id=ingredient.id,
                    quantity=ingredient_qty,
                )
                db.add(recipe_ing)

            meal = Meal(
                meal_plan_id=meal_plan.id,
                recipe_id=recipe.id,
                eat_date=eat_date,
                meal_type=generated_meal.get("meal_type"),
                servings=generated_meal.get("servings"),
            )
            db.add(meal)

    meal_plan.status = "completed"
    await db.commit()
    await db.refresh(meal_plan)

    if wait_for_grocery:
        await generate_grocery_list_background(meal_plan.id)
    else:
        asyncio.create_task(generate_grocery_list_background(meal_plan.id))

    logger.info("MealPlan %s persisted from draft for user %s", meal_plan.id, user_id)
    return meal_plan


async def generate_meal_plan_background(
    user_id: str, total_days: int, custom_prompt: str = ""
):
    """Backward-compatible helper now generates a draft-only payload."""
    return await generate_meal_plan_draft(
        user_id=user_id, total_days=total_days, custom_prompt=custom_prompt
    )
