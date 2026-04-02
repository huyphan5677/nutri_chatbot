import logging
import re

from nutri.ai.agents.grocery_list_agent import GroceryListGeneratorAgent
from nutri.core.db.session import async_session_maker
from nutri.core.grocery.models import GroceryItem
from nutri.core.menus.models import Ingredient, Meal, MealPlan, Recipe, RecipeIngredient
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

logger = logging.getLogger("nutri.ai.workflows.grocery_workflow")


def _parse_numeric_quantity(value) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip().replace(",", ".")
    match = re.search(r"\d+(?:\.\d+)?", text)
    if not match:
        return None
    try:
        return float(match.group())
    except Exception:
        return None


async def generate_grocery_list_background(meal_plan_id: str):
    """Background workflow to aggregate ingredients from a meal plan into a grocery list."""

    async with async_session_maker() as db:
        # 1. Fetch MealPlan and its relations
        result = await db.execute(
            select(MealPlan)
            .options(
                selectinload(MealPlan.meals)
                .selectinload(Meal.recipe)
                .selectinload(Recipe.ingredients)
                .selectinload(RecipeIngredient.ingredient)
            )
            .where(MealPlan.id == meal_plan_id)
        )
        meal_plan = result.scalars().first()

        if not meal_plan:
            logger.error("Grocery Workflow Error: MealPlan %s not found.", meal_plan_id)
            return

        # 2. Extract Raw Ingredients Context
        raw_ingredients_lines = []
        meal_fallback_lines = []
        for meal in meal_plan.meals:
            if meal.recipe and meal.recipe.name:
                meal_fallback_lines.append(
                    f"Meal: {meal.recipe.name} ({meal.meal_type}) on {meal.eat_date}"
                )

            if meal.recipe and meal.recipe.ingredients:
                for ri in meal.recipe.ingredients:
                    grams = _parse_numeric_quantity(ri.quantity)
                    if grams is None:
                        raw_ingredients_lines.append(
                            f"- name: {ri.ingredient.name} | meal_type: {meal.meal_type} | day: {meal.eat_date}"
                        )
                    else:
                        grams_display = (
                            int(grams) if float(grams).is_integer() else grams
                        )
                        raw_ingredients_lines.append(
                            f"- name: {ri.ingredient.name} | grams: {grams_display} | meal_type: {meal.meal_type} | day: {meal.eat_date}"
                        )

        raw_context = "\n".join(raw_ingredients_lines)
        if not raw_context:
            if not meal_fallback_lines:
                logger.error(
                    "Grocery Workflow: No meals found to infer groceries for MealPlan %s.",
                    meal_plan_id,
                )
                return

            logger.warning(
                "Grocery Workflow: No explicit ingredients for MealPlan %s, inferring from meal names.",
                meal_plan_id,
            )
            raw_context = "\n".join(
                [
                    "No explicit ingredient lines were provided.",
                    "Infer a practical grocery list from these meal names and meal types:",
                    *meal_fallback_lines,
                ]
            )

        logger.info("Generating Grocery List for MealPlan %s...", meal_plan_id)

        # 3. Invoke Agent
        agent = GroceryListGeneratorAgent()
        grocery_data = await agent.agenerate(raw_context)

        # 4. Save to Database
        for item in grocery_data.items:
            # Check if ingredient exists, else create
            res = await db.execute(
                select(Ingredient).where(Ingredient.name == item.name)
            )
            ingredient = res.scalars().first()
            if not ingredient:
                ingredient = Ingredient(name=item.name, category=item.category)
                db.add(ingredient)
                await db.flush()
            elif not ingredient.category and item.category:
                ingredient.category = item.category

            # Auto-check staples like oil and spices
            cat_lower = (item.category or "").lower()
            name_lower = (item.name or "").lower()
            staple_keywords = ["dầu ăn", "gia vị", "oil", "spices", "seasoning", "nước chấm"]
            is_staple = any(k in cat_lower or k in name_lower for k in staple_keywords)

            grocery_item = GroceryItem(
                user_id=meal_plan.user_id,
                meal_plan_id=meal_plan.id,
                ingredient_id=ingredient.id,
                quantity=_parse_numeric_quantity(item.quantity),
                is_purchased=is_staple,
            )
            db.add(grocery_item)

        await db.commit()
        logger.info("Grocery List generated for MealPlan %s.", meal_plan_id)
