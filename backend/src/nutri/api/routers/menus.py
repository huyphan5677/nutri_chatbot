# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import uuid
import logging
from typing import TYPE_CHECKING, Annotated

from fastapi import Depends, APIRouter, HTTPException
from sqlalchemy import desc, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from nutri.core.menus.dto import (
    MealPlanResponse,
    DeleteMenuResponse,
    SaveMenuShoppingItem,
    MealPlanSummaryResponse,
    SaveMenuFromChatRequest,
    SaveMenuFromChatResponse,
    DeleteCurrentMenuResponse,
)
from nutri.core.db.session import get_db
from nutri.api.dependencies import get_current_user
from nutri.core.auth.models import User
from nutri.core.chat.models import ChatMessage, ChatSession
from nutri.core.menus.models import MealPlan
from nutri.core.grocery.models import GroceryItem, ShoppingOrder
from nutri.core.menus.services import (
    apply_menu_updates,
    find_meal_plan_draft,
    get_latest_meal_plan,
    format_quantity_grams,
    meal_plan_to_response,
    get_user_meal_plan_by_id,
)
from nutri.ai.workflows.meal_plan_workflow import persist_meal_plan_from_draft


if TYPE_CHECKING:
    from nutri.core.menus.dto import (
        UpdateMenuRequest,
        UpdateCurrentMenuRequest,
    )


router = APIRouter()
logger = logging.getLogger("nutri.api.routers.menus")


@router.get("/current", response_model=MealPlanResponse)
async def get_current_menu(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MealPlanResponse:
    """Get the current menu for the user.

    Args:
        db: Database session
        current_user: Current user

    Returns:
        MealPlanResponse: Current menu

    Raises:
        HTTPException: If no meal plan is found
    """
    meal_plan = await get_latest_meal_plan(db, current_user.id)

    if not meal_plan:
        logger.warning("No meal plan found for user_id=%s", current_user.id)
        raise HTTPException(
            status_code=404,
            detail="No meal plan found. Try asking Corin to create one!",
        )

    logger.info(
        "get_current_menu | user_id=%s | plan_id=%s | meals=%d",
        current_user.id,
        meal_plan.id,
        len(meal_plan.meals),
    )

    return meal_plan_to_response(meal_plan)


@router.patch("/current", response_model=MealPlanResponse)
async def update_current_menu(
    payload: UpdateCurrentMenuRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MealPlanResponse:
    """Update the current menu for the user.

    Args:
        payload: Update menu request
        db: Database session
        current_user: Current user

    Returns:
        MealPlanResponse: Updated menu

    Raises:
        HTTPException: If no meal plan is found
    """
    meal_plan = await get_latest_meal_plan(db, current_user.id)
    if not meal_plan:
        raise HTTPException(status_code=404, detail="No meal plan found")

    await apply_menu_updates(db, meal_plan, payload)

    await db.commit()
    await db.refresh(meal_plan)

    refreshed = await get_latest_meal_plan(db, current_user.id)
    return meal_plan_to_response(refreshed)


@router.delete("/current", response_model=DeleteCurrentMenuResponse)
async def delete_current_menu(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DeleteCurrentMenuResponse:
    """Delete the current menu for the user.

    Args:
        db: Database session
        current_user: Current user

    Returns:
        DeleteCurrentMenuResponse: Delete current menu response

    Raises:
        HTTPException: If no meal plan is found
    """
    meal_plan = await get_latest_meal_plan(db, current_user.id)
    if not meal_plan:
        raise HTTPException(status_code=404, detail="No meal plan found")

    meal_plan_id = meal_plan.id

    await db.execute(
        delete(GroceryItem).where(GroceryItem.meal_plan_id == meal_plan_id)
    )
    await db.execute(
        delete(ShoppingOrder).where(ShoppingOrder.meal_plan_id == meal_plan_id)
    )

    await db.delete(meal_plan)
    await db.commit()

    return DeleteCurrentMenuResponse(
        status="deleted", meal_plan_id=str(meal_plan_id)
    )


@router.get("", response_model=list[MealPlanSummaryResponse])
async def list_menus(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[MealPlanSummaryResponse]:
    """List all menus for the user.

    Args:
        db: Database session
        current_user: Current user

    Returns:
        list[MealPlanSummaryResponse]: List of meal plans
    """
    result = await db.execute(
        select(MealPlan)
        .where(MealPlan.user_id == current_user.id)
        .order_by(desc(MealPlan.created_at))
    )
    meal_plans = result.scalars().all()

    return [
        MealPlanSummaryResponse(
            id=str(plan.id),
            name=plan.name,
            start_date=str(plan.start_date),
            end_date=str(plan.end_date),
            status=plan.status,
        )
        for plan in meal_plans
    ]


# -------
# Meal ID
# -------


@router.get("/{meal_plan_id}", response_model=MealPlanResponse)
async def get_menu_by_id(
    meal_plan_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MealPlanResponse:
    """Get the meal plan by ID.

    Args:
        meal_plan_id: Meal plan ID
        db: Database session
        current_user: Current user

    Returns:
        MealPlanResponse: Meal plan

    Raises:
        HTTPException: If no meal plan is found
    """
    meal_plan = await get_user_meal_plan_by_id(
        db, current_user.id, meal_plan_id
    )
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    return meal_plan_to_response(meal_plan)


@router.patch("/{meal_plan_id}", response_model=MealPlanResponse)
async def update_menu_by_id(
    meal_plan_id: str,
    payload: UpdateMenuRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MealPlanResponse:
    """Update the meal plan by ID.

    Args:
        meal_plan_id: Meal plan ID
        payload: Update menu request
        db: Database session
        current_user: Current user

    Returns:
        MealPlanResponse: Updated meal plan

    Raises:
        HTTPException: If no meal plan is found
    """
    meal_plan = await get_user_meal_plan_by_id(
        db, current_user.id, meal_plan_id
    )
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    await apply_menu_updates(db, meal_plan, payload)

    await db.commit()

    refreshed = await get_user_meal_plan_by_id(
        db, current_user.id, meal_plan_id
    )
    return meal_plan_to_response(refreshed)


@router.delete("/{meal_plan_id}", response_model=DeleteMenuResponse)
async def delete_menu_by_id(
    meal_plan_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DeleteMenuResponse:
    """Delete the meal plan by ID.

    Args:
        meal_plan_id: Meal plan ID
        db: Database session
        current_user: Current user

    Returns:
        DeleteMenuResponse: Delete menu response

    Raises:
        HTTPException: If no meal plan is found
    """
    meal_plan = await get_user_meal_plan_by_id(
        db, current_user.id, meal_plan_id
    )
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    plan_id = meal_plan.id

    await db.execute(
        delete(GroceryItem).where(GroceryItem.meal_plan_id == plan_id)
    )
    await db.execute(
        delete(ShoppingOrder).where(ShoppingOrder.meal_plan_id == plan_id)
    )

    await db.delete(meal_plan)
    await db.commit()

    return DeleteMenuResponse(status="deleted", meal_plan_id=str(plan_id))


# --------------
# Save from chat
# --------------


@router.post("/save-from-chat", response_model=SaveMenuFromChatResponse)
async def save_menu_from_chat(
    payload: SaveMenuFromChatRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> SaveMenuFromChatResponse:
    """Save the meal plan from chat.

    Args:
        payload: Save menu from chat request
        db: Database session
        current_user: Current user

    Returns:
        SaveMenuFromChatResponse: Save menu from chat response

    Raises:
        HTTPException: If chat message is not found
    """
    try:
        chat_message_uuid = uuid.UUID(payload.chat_message_id)
    except (ValueError, TypeError):
        raise HTTPException(  # noqa: B904
            status_code=400,
            detail="Chat message id is invalid. Please wait a moment and try again.",
        )

    result = await db.execute(
        select(ChatMessage)
        .join(ChatSession, ChatSession.id == ChatMessage.session_id)
        .where(ChatMessage.id == chat_message_uuid)
        .where(ChatSession.user_id == current_user.id)
    )
    chat_message = result.scalars().first()
    if not chat_message:
        raise HTTPException(status_code=404, detail="Chat message not found")

    draft_idx, draft = find_meal_plan_draft(chat_message.tool_calls)
    if draft is None:
        raise HTTPException(
            status_code=400, detail="No meal plan draft found in this message"
        )

    if payload.modified_draft:
        draft = payload.modified_draft

    if draft.get("saved"):
        existing_items_result = await db.execute(
            select(GroceryItem)
            .options(selectinload(GroceryItem.ingredient))
            .where(GroceryItem.user_id == current_user.id)
            .where(GroceryItem.meal_plan_id == draft.get("meal_plan_id"))
        )
        existing_items = existing_items_result.scalars().all()
        return SaveMenuFromChatResponse(
            status="already_saved",
            meal_plan_id=draft.get("meal_plan_id"),
            shopping_list=[
                SaveMenuShoppingItem(
                    name=item.ingredient.name if item.ingredient else "Unknown",
                    category=item.ingredient.category
                    if item.ingredient
                    else "Other",
                    quantity=format_quantity_grams(item.quantity),
                )
                for item in existing_items
            ],
        )

    try:
        meal_plan = await persist_meal_plan_from_draft(
            db=db,
            user_id=str(current_user.id),
            draft_payload=draft,
            wait_for_grocery=True,
        )
    except Exception as exc:
        logger.exception(
            "save_menu_from_chat failed | message_id=%s",
            payload.chat_message_id,
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to save menu: {exc}"
        ) from exc

    updated_tool_calls = list(chat_message.tool_calls or [])
    updated_draft = {**draft, "saved": True, "meal_plan_id": str(meal_plan.id)}
    updated_tool_calls[draft_idx] = {
        "type": "meal_plan_draft",
        "data": updated_draft,
    }
    chat_message.tool_calls = updated_tool_calls

    flag_modified(chat_message, "tool_calls")

    grocery_items_result = await db.execute(
        select(GroceryItem)
        .options(selectinload(GroceryItem.ingredient))
        .where(GroceryItem.user_id == current_user.id)
        .where(GroceryItem.meal_plan_id == meal_plan.id)
    )
    grocery_items = grocery_items_result.scalars().all()

    shopping_list_items = [
        SaveMenuShoppingItem(
            name=item.ingredient.name if item.ingredient else "Unknown",
            category=item.ingredient.category if item.ingredient else "Other",
            quantity=format_quantity_grams(item.quantity),
        )
        for item in grocery_items
    ]

    await db.commit()

    return SaveMenuFromChatResponse(
        status="saved",
        meal_plan_id=str(meal_plan.id),
        shopping_list=shopping_list_items,
    )
