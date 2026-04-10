import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from nutri.ai.workflows.meal_plan_workflow import persist_meal_plan_from_draft
from nutri.api.dependencies import get_current_user
from nutri.core.auth.models import User
from nutri.core.chat.models import ChatMessage, ChatSession
from nutri.core.db.session import get_db
from nutri.core.grocery.models import GroceryItem, ShoppingOrder
from nutri.core.menus.dto import (
    DeleteCurrentMenuResponse,
    DeleteMenuResponse,
    MealPlanResponse,
    MealPlanSummaryResponse,
    SaveMenuFromChatRequest,
    SaveMenuFromChatResponse,
    SaveMenuShoppingItem,
    UpdateCurrentMenuRequest,
    UpdateMenuRequest,
)
from nutri.core.menus.models import MealPlan
from nutri.core.menus.services import (
    apply_menu_updates,
    find_meal_plan_draft,
    format_quantity_grams,
    get_latest_meal_plan,
    get_user_meal_plan_by_id,
    meal_plan_to_response,
)
from sqlalchemy import delete, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

router = APIRouter()
logger = logging.getLogger("nutri.api.routers.menus")


@router.get("/current", response_model=MealPlanResponse)
async def get_current_menu(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get the current menu for the user."""
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    return DeleteCurrentMenuResponse(status="deleted", meal_plan_id=str(meal_plan_id))


@router.get("", response_model=list[MealPlanSummaryResponse])
async def list_menus(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal_plan = await get_user_meal_plan_by_id(db, current_user.id, meal_plan_id)
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    return meal_plan_to_response(meal_plan)


@router.patch("/{meal_plan_id}", response_model=MealPlanResponse)
async def update_menu_by_id(
    meal_plan_id: str,
    payload: UpdateMenuRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal_plan = await get_user_meal_plan_by_id(db, current_user.id, meal_plan_id)
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    await apply_menu_updates(db, meal_plan, payload)

    await db.commit()

    refreshed = await get_user_meal_plan_by_id(db, current_user.id, meal_plan_id)
    return meal_plan_to_response(refreshed)


@router.delete("/{meal_plan_id}", response_model=DeleteMenuResponse)
async def delete_menu_by_id(
    meal_plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal_plan = await get_user_meal_plan_by_id(db, current_user.id, meal_plan_id)
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    plan_id = meal_plan.id

    await db.execute(delete(GroceryItem).where(GroceryItem.meal_plan_id == plan_id))
    await db.execute(delete(ShoppingOrder).where(ShoppingOrder.meal_plan_id == plan_id))

    await db.delete(meal_plan)
    await db.commit()

    return DeleteMenuResponse(status="deleted", meal_plan_id=str(plan_id))


# --------------
# Save from chat
# --------------


@router.post("/save-from-chat", response_model=SaveMenuFromChatResponse)
async def save_menu_from_chat(
    payload: SaveMenuFromChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        chat_message_uuid = uuid.UUID(payload.chat_message_id)
    except (ValueError, TypeError):
        raise HTTPException(
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
                    category=item.ingredient.category if item.ingredient else "Other",
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
            "save_menu_from_chat failed | message_id=%s", payload.chat_message_id
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to save menu: {exc}"
        ) from exc

    updated_tool_calls = list(chat_message.tool_calls or [])
    updated_draft = {**draft, "saved": True, "meal_plan_id": str(meal_plan.id)}
    updated_tool_calls[draft_idx] = {"type": "meal_plan_draft", "data": updated_draft}
    chat_message.tool_calls = updated_tool_calls

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
