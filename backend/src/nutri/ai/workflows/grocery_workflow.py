# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import re
import asyncio
import logging

from sqlalchemy.orm import selectinload
from sqlalchemy.future import select

from nutri.core.db.session import async_session_maker
from nutri.core.menus.models import (
    Meal,
    Recipe,
    MealPlan,
    Ingredient,
    RecipeIngredient,
)
from nutri.core.grocery.models import GroceryItem
from nutri.ai.agents.grocery_list_agent import GroceryListGeneratorAgent


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
    """Background workflow to aggregate ingredients from a meal plan."""
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
            logger.error(
                "Grocery Workflow Error: MealPlan %s not found.", meal_plan_id
            )
            return

        # 2. Chunk meals for parallel processing
        meals_list = list(meal_plan.meals)
        chunk_size = 3  # approx 1 day
        chunks = [
            meals_list[i : i + chunk_size]
            for i in range(0, len(meals_list), chunk_size)
        ]

        agent = GroceryListGeneratorAgent()
        semaphore = asyncio.Semaphore(3)

        async def _process_chunk(chunk_meals, delay: float):
            if delay > 0:
                await asyncio.sleep(delay)

            raw_ingredients_lines = []
            meal_fallback_lines = []
            for meal in chunk_meals:
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
                                int(grams)
                                if float(grams).is_integer()
                                else grams
                            )
                            raw_ingredients_lines.append(
                                f"- name: {ri.ingredient.name} | grams: {grams_display} | meal_type: {meal.meal_type} | day: {meal.eat_date}"
                            )

            raw_context = "\n".join(raw_ingredients_lines)
            if not raw_context:
                if not meal_fallback_lines:
                    return []
                raw_context = "\n".join([
                    "No explicit ingredient lines were provided.",
                    "Infer a practical grocery list from these meal names and meal types:",
                    *meal_fallback_lines,
                ])

            async with semaphore:
                try:
                    grocery_data = await agent.agenerate(raw_context)
                    return grocery_data.items
                except Exception:
                    logger.exception("Grocery chunk processing failed")
                    return []

        logger.info(
            "Generating Grocery List for MealPlan %s in %d chunks...",
            meal_plan_id,
            len(chunks),
        )

        # 3. Invoke Agent in Parallel
        tasks = []
        delay_counter = 0.0
        for chunk in chunks:
            tasks.append(_process_chunk(chunk, delay=delay_counter))
            delay_counter += 1.5  # Stagger APIs strongly to avoid proxy limits

        results = await asyncio.gather(*tasks)

        # 4. Aggregate results across chunks
        all_items = []
        for items in results:
            all_items.extend(items)

        if not all_items:
            logger.warning(
                "No grocery items generated for MealPlan %s", meal_plan_id
            )
            return

        aggregated_items = {}
        for item in all_items:
            name_lower = (item.name or "Unknown").strip().lower()
            qty = _parse_numeric_quantity(item.quantity) or 0.0

            if name_lower in aggregated_items:
                aggregated_items[name_lower]["quantity"] += qty
                # Update category if the previous one was generic
                if (
                    item.category
                    and aggregated_items[name_lower]["category"] == "Other"
                ):
                    aggregated_items[name_lower]["category"] = item.category
            else:
                aggregated_items[name_lower] = {
                    "name": (item.name or "Unknown").strip(),
                    "category": item.category or "Other",
                    "quantity": qty,
                }

        # 5. Save to Database
        for data in aggregated_items.values():
            item_name = data["name"]
            item_cat = data["category"]
            item_qty = data["quantity"] if data["quantity"] > 0 else None

            res = await db.execute(
                select(Ingredient).where(Ingredient.name == item_name)
            )
            ingredient = res.scalars().first()

            if not ingredient:
                ingredient = Ingredient(name=item_name, category=item_cat)
                db.add(ingredient)
                await db.flush()
            elif not ingredient.category and item_cat and item_cat != "Other":
                ingredient.category = item_cat

            # Auto-check staples like oil and spices
            cat_lower = item_cat.lower()
            name_lower_val = item_name.lower()
            staple_keywords = [
                "dầu ăn",
                "gia vị",
                "oil",
                "spices",
                "seasoning",
                "nước chấm",
            ]
            is_staple = any(
                k in cat_lower or k in name_lower_val for k in staple_keywords
            )

            grocery_item = GroceryItem(
                user_id=meal_plan.user_id,
                meal_plan_id=meal_plan.id,
                ingredient_id=ingredient.id,
                quantity=item_qty,
                is_purchased=is_staple,
            )
            db.add(grocery_item)

        await db.commit()
        logger.info(
            "Grocery List generated safely for MealPlan %s | Unique Items: %d",
            meal_plan_id,
            len(aggregated_items),
        )
