# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, APIRouter, HTTPException
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from nutri.core.db.session import get_db
from nutri.api.dependencies import get_current_user
from nutri.core.auth.models import User
from nutri.core.menus.models import Recipe, CollectionRecipe, RecipeCollection
from nutri.core.collections.dto import (
    RecipeDTO,
    CollectionDTO,
    AddRecipeRequest,
    CollectionListResponse,
    CreateCollectionRequest,
    CollectionRecipeResponse,
)
from nutri.core.collections.services import ensure_default_collections


router = APIRouter()


# ----------------------
# Collections Management
# ----------------------


@router.get("", response_model=CollectionListResponse)
async def get_collections(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CollectionListResponse:
    """Get all collections for the current user."""
    await ensure_default_collections(db, current_user.id)

    query = (
        select(RecipeCollection)
        .options(selectinload(RecipeCollection.collection_recipes))
        .where(RecipeCollection.user_id == current_user.id)
        .order_by(RecipeCollection.created_at.asc())
    )
    res = await db.execute(query)
    collections = res.scalars().all()

    dtos = [
        CollectionDTO(
            id=str(c.id),
            name=c.name,
            is_default=c.is_default,
            recipe_count=len(c.collection_recipes),
        )
        for c in collections
    ]
    return CollectionListResponse(collections=dtos)


@router.post("", response_model=CollectionDTO)
async def create_collection(
    req: CreateCollectionRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CollectionDTO:
    """Create a new collection."""
    new_col = RecipeCollection(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=req.name,
        is_default=False,
    )
    db.add(new_col)
    await db.commit()
    return CollectionDTO(
        id=str(new_col.id),
        name=new_col.name,
        is_default=new_col.is_default,
        recipe_count=0,
    )


# -------------
# Collection ID
# -------------


@router.delete("/{collection_id}")
async def delete_collection(
    collection_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict[str, str]:
    """Delete a collection.

    Args:
        collection_id: ID of the collection to delete.
        db: Database session.
        current_user: Current user.

    Returns:
        Dictionary with status and message.

    Raises:
        HTTPException: If collection not found or is default.
    """
    query = select(RecipeCollection).where(
        RecipeCollection.id == collection_id,
        RecipeCollection.user_id == current_user.id,
    )
    res = await db.execute(query)
    col = res.scalars().first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    if col.is_default:
        raise HTTPException(
            status_code=400, detail="Cannot delete default collections"
        )

    await db.delete(col)
    await db.commit()
    return {"status": "success", "message": "Collection deleted"}


@router.get("/{collection_id}/recipes", response_model=CollectionRecipeResponse)
async def get_collection_recipes(
    collection_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CollectionRecipeResponse:
    """Get all recipes in a collection.

    Args:
        collection_id: ID of the collection to get recipes from.
        db: Database session.
        current_user: Current user.

    Returns:
        Dictionary with status and message.

    Raises:
        HTTPException: If collection not found.
    """
    query = select(RecipeCollection).where(
        RecipeCollection.id == collection_id,
        RecipeCollection.user_id == current_user.id,
    )
    res = await db.execute(query)
    if not res.scalars().first():
        raise HTTPException(status_code=404, detail="Collection not found")

    recipe_query = (
        select(CollectionRecipe)
        .options(selectinload(CollectionRecipe.recipe))
        .where(CollectionRecipe.collection_id == collection_id)
        .order_by(CollectionRecipe.added_at.desc())
    )
    r_res = await db.execute(recipe_query)
    links = r_res.scalars().all()

    recipes_dto = [
        RecipeDTO(
            id=str(link.recipe.id),
            name=link.recipe.name,
            image_url=link.recipe.image_url,
            prep_time_minutes=link.recipe.prep_time_minutes,
            type=link.recipe.type,
        )
        for link in links
        if link.recipe
    ]
    return CollectionRecipeResponse(recipes=recipes_dto)


@router.post("/{collection_id}/recipes")
async def add_recipe_to_collection(
    collection_id: str,
    req: AddRecipeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict[str, str]:
    """Add a recipe to a collection.

    Args:
        collection_id: ID of the collection to add the recipe to.
        req: Request containing the recipe ID.
        db: Database session.
        current_user: Current user.

    Returns:
        Dictionary with status and message.

    Raises:
        HTTPException: If collection or recipe not found.
    """
    # Verify collection
    query = select(RecipeCollection).where(
        RecipeCollection.id == collection_id,
        RecipeCollection.user_id == current_user.id,
    )
    res = await db.execute(query)
    if not res.scalars().first():
        raise HTTPException(status_code=404, detail="Collection not found")

    # Verify recipe
    r_query = select(Recipe).where(Recipe.id == req.recipe_id)
    r_res = await db.execute(r_query)
    if not r_res.scalars().first():
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Check if already exists
    link_query = select(CollectionRecipe).where(
        CollectionRecipe.collection_id == collection_id,
        CollectionRecipe.recipe_id == req.recipe_id,
    )
    l_res = await db.execute(link_query)
    if l_res.scalars().first():
        return {"status": "success", "message": "Recipe already in collection"}

    new_link = CollectionRecipe(
        id=uuid.uuid4(), collection_id=collection_id, recipe_id=req.recipe_id
    )
    db.add(new_link)
    await db.commit()
    return {"status": "success", "message": "Recipe added to collection"}


@router.delete("/{collection_id}/recipes/{recipe_id}")
async def remove_recipe_from_collection(
    collection_id: str,
    recipe_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict[str, str]:
    """Remove a recipe from a collection.

    Args:
        collection_id: ID of the collection to remove the recipe from.
        recipe_id: ID of the recipe to remove.
        db: Database session.
        current_user: Current user.

    Returns:
        Dictionary with status and message.

    Raises:
        HTTPException: If collection or recipe not found.
    """
    # Verify collection
    query = select(RecipeCollection).where(
        RecipeCollection.id == collection_id,
        RecipeCollection.user_id == current_user.id,
    )
    res = await db.execute(query)
    if not res.scalars().first():
        raise HTTPException(status_code=404, detail="Collection not found")

    # Remove link
    link_query = select(CollectionRecipe).where(
        CollectionRecipe.collection_id == collection_id,
        CollectionRecipe.recipe_id == recipe_id,
    )
    l_res = await db.execute(link_query)
    link = l_res.scalars().first()
    if not link:
        raise HTTPException(status_code=404, detail="Recipe not in collection")

    await db.delete(link)
    await db.commit()
    return {"status": "success", "message": "Recipe removed from collection"}
