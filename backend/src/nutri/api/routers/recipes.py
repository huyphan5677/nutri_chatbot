# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING, Annotated

from fastapi import Query, Depends, APIRouter, HTTPException
from sqlalchemy import or_, func, delete
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from nutri.core.db.session import get_db
from nutri.api.dependencies import get_current_user, get_optional_user
from nutri.core.auth.models import User
from nutri.core.recipes.dto import (
    RecipeRead,
    RecipeSearchResponse,
)
from nutri.core.menus.models import (
    Meal,
    Recipe,
    CollectionRecipe,
    RecipeIngredient,
)
from nutri.ai.tools.recipe_tools import perform_recipe_web_search


if TYPE_CHECKING:
    from nutri.core.recipes.dto import (
        RecipeUpdateRequest,
    )


router = APIRouter()
logger = logging.getLogger("nutri.api.routers.recipes")


@router.get("/", response_model=RecipeSearchResponse)
async def search_recipes(
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str | None = None,
    type: str | None = None,
    max_time: Annotated[
        int | None, Query(description="Max prep time in minutes")
    ] = None,
    skip: int = 0,
    limit: int = 50,
) -> RecipeSearchResponse:
    """Search for recipes.

    Args:
        q: The search query.
        type: The type of recipe.
        max_time: The maximum prep time in minutes.
        skip: The number of recipes to skip.
        limit: The number of recipes to return.
        db: The database session.

    Returns:
        A list of RecipeRead objects.
    """
    query = select(Recipe)

    if q:
        search_term = f"%{q.lower()}%"
        query = query.where(
            or_(
                Recipe.name.ilike(search_term),
                Recipe.description.ilike(search_term),
            )
        )
    if type:
        query = query.where(Recipe.type.ilike(f"%{type}%"))
    if max_time is not None:
        query = query.where(Recipe.prep_time_minutes <= max_time)

    count_query = select(func.count()).select_from(Recipe)
    if q:
        search_term = f"%{q.lower()}%"
        count_query = count_query.where(
            or_(
                Recipe.name.ilike(search_term),
                Recipe.description.ilike(search_term),
            )
        )
    if type:
        count_query = count_query.where(Recipe.type.ilike(f"%{type}%"))
    if max_time is not None:
        count_query = count_query.where(Recipe.prep_time_minutes <= max_time)

    count_result = await db.execute(count_query)
    total = int(count_result.scalar() or 0)

    result = await db.execute(query.offset(skip).limit(limit))
    recipes = result.scalars().all()

    return RecipeSearchResponse(
        recipes=[RecipeRead.model_validate(r) for r in recipes],
        total=total,
    )


@router.post("/web-search", response_model=list[RecipeRead])
async def web_search_recipe(
    query: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_user)],
) -> list[RecipeRead]:
    """Triggers an AI agent to perform a web search for the recipe.

    Args:
        query: The search query.
        db: The database session.
        current_user: The current user.

    Returns:
        A list of RecipeRead objects.

    Raises:
        HTTPException: If the web search fails.
    """
    user_id = current_user.id if current_user else "anonymous"
    logger.info("web_search_recipe | user_id=%s | query=%s", user_id, query)

    try:
        recipe_data_list = await perform_recipe_web_search(query)
        if not recipe_data_list:
            raise HTTPException(  # noqa: TRY301
                status_code=404,
                detail="Could not find any valid recipes for this query.",
            )

        saved_recipes = []
        for recipe_data in recipe_data_list:
            instructions_data = recipe_data.get("instructions", "")
            if isinstance(instructions_data, list):
                instructions_data = json.dumps(
                    instructions_data, ensure_ascii=False
                )

            # Create a new recipe in the database
            new_recipe = Recipe(
                name=recipe_data.get("name", query),
                description=recipe_data.get("description", ""),
                prep_time_minutes=recipe_data.get("prep_time_minutes", 0),
                cook_time_minutes=recipe_data.get("cook_time_minutes", 0),
                total_calories=recipe_data.get("total_calories", 0),
                type=recipe_data.get("type", "General"),
                image_url=recipe_data.get("image_url", ""),
                source_url=recipe_data.get("source_url", ""),
                instructions=instructions_data,
            )
            db.add(new_recipe)
            saved_recipes.append(new_recipe)

        await db.commit()
        for recipe in saved_recipes:
            await db.refresh(recipe)

        return [RecipeRead.model_validate(r) for r in saved_recipes]
    except Exception as e:
        logger.error("Failed to perform web search for recipe: %s", str(e))  # noqa: TRY400
        raise HTTPException(status_code=500, detail=f"Web search failed: {e!s}")  # noqa: B904


# ---------
# Recipe ID
# ---------


@router.patch("/{recipe_id}", response_model=RecipeRead)
async def update_recipe(
    recipe_id: str,
    payload: RecipeUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> RecipeRead:
    """Update recipe fields.

    Args:
        recipe_id: The ID of the recipe to update.
        payload: The recipe data to update.
        db: The database session.
        current_user: The current user.

    Returns:
        The updated recipe.

    Raises:
        HTTPException: If the recipe is not found.
    """
    _ = current_user

    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    recipe = result.scalars().first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(recipe, key, value)

    await db.commit()
    await db.refresh(recipe)
    return RecipeRead.model_validate(recipe)


@router.delete("/{recipe_id}")
async def delete_recipe(
    recipe_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Delete a recipe if it is not referenced by meal plans.

    Args:
        recipe_id: The ID of the recipe to delete.
        db: The database session.
        current_user: The current user.

    Returns:
        None

    Raises:
        HTTPException: If the recipe is not found or is used by meal plans.
    """
    _ = current_user

    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    recipe = result.scalars().first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    usage_result = await db.execute(
        select(func.count())
        .select_from(Meal)
        .where(Meal.recipe_id == recipe_id)
    )
    meal_usage_count = int(usage_result.scalar() or 0)
    if meal_usage_count > 0:
        raise HTTPException(
            status_code=409,
            detail="Recipe is used by existing meal plans and cannot be deleted",
        )

    await db.execute(
        delete(CollectionRecipe).where(CollectionRecipe.recipe_id == recipe_id)
    )
    await db.execute(
        delete(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe_id)
    )
    await db.delete(recipe)
    await db.commit()

    return {"status": "success", "message": "Recipe deleted"}
