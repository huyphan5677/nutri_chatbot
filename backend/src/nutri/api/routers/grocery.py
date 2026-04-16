# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import re
import uuid
import logging
from typing import TYPE_CHECKING, Annotated

from fastapi import Query, Depends, APIRouter, HTTPException, BackgroundTasks
from sqlalchemy import desc, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from nutri.core.db.session import get_db
from nutri.api.dependencies import get_current_user
from nutri.core.auth.models import User
from nutri.core.grocery.dto import (
    GroceryItemDTO,
    ShoppingRequest,
    GroceryListResponse,
    GroceryMenuGroupDTO,
    GroceryByMenuResponse,
    ShoppingOrderResponse,
    ShoppingHistoryItemDTO,
    ShoppingHistoryResponse,
    ShoppingOrderStartResponse,
)
from nutri.core.menus.models import MealPlan, Ingredient
from nutri.core.grocery.models import GroceryItem, ShoppingOrder, UserInventory
from nutri.core.grocery.services import format_quantity_grams
from nutri.core.grocery.shopping_bg import process_shopping_background
from nutri.core.grocery.store_mapping import (
    get_lotte_branches,
    get_winmart_provinces,
    get_winmart_stores_by_province,
)
from nutri.ai.agents.fridge_check_agent import FridgeCheckAgent


if TYPE_CHECKING:
    from nutri.core.grocery.dto import (
        UpdateGroceryItemRequest,
    )


router = APIRouter()


# ------------
# Grocery List
# ------------


@router.get("/current", response_model=GroceryListResponse)
async def get_current_grocery_list(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> GroceryListResponse:
    """Get the current grocery list for the user."""
    # Find most 1 recent meal plan to filter groceries
    result = await db.execute(
        select(MealPlan.id)
        .where(MealPlan.user_id == current_user.id)
        .order_by(desc(MealPlan.created_at))
    )
    latest_plan_id = result.scalars().first()

    if not latest_plan_id:
        return GroceryListResponse(items=[])

    query = (
        select(GroceryItem)
        .options(selectinload(GroceryItem.ingredient))
        .where(
            GroceryItem.user_id == current_user.id,
            GroceryItem.meal_plan_id == latest_plan_id,
        )
    )
    res = await db.execute(query)
    items = res.scalars().all()

    dtos = [
        GroceryItemDTO(
            id=str(item.id),
            name=item.ingredient.name if item.ingredient else "Unknown",
            category=item.ingredient.category if item.ingredient else "Other",
            quantity=format_quantity_grams(item.quantity),
            is_purchased=item.is_purchased,
        )
        for item in items
    ]

    return GroceryListResponse(items=dtos)


@router.patch("/{item_id}", response_model=GroceryItemDTO)
async def update_grocery_item(
    item_id: str,
    request: UpdateGroceryItemRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> GroceryItemDTO:
    """Update a grocery item.

    Args:
        item_id (str): ID of the grocery item to update.
        request (UpdateGroceryItemRequest): Request body with fields to update.
        db (AsyncSession): Database session.
        current_user (User): Current user.

    Returns:
        GroceryItemDTO: Updated grocery item.

    Raises:
        HTTPException: If the grocery item is not found.
    """
    # 1. Find the grocery item
    query = (
        select(GroceryItem)
        .options(selectinload(GroceryItem.ingredient))
        .where(
            GroceryItem.id == item_id,
            GroceryItem.user_id == current_user.id,
        )
    )
    result = await db.execute(query)
    grocery_item = result.scalars().first()

    if not grocery_item:
        raise HTTPException(status_code=404, detail="Grocery item not found")

    # 2. If name or category changed, we need to find/create a new Ingredient
    # and re-link it
    if request.name is not None or request.category is not None:
        new_name = request.name or (
            grocery_item.ingredient.name
            if grocery_item.ingredient
            else "Unknown"
        )
        new_category = request.category or (
            grocery_item.ingredient.category
            if grocery_item.ingredient
            else "Other"
        )

        # Find if this exact ingredient exists
        ingredient_query = select(Ingredient).where(
            Ingredient.name.ilike(new_name)
        )
        ingredient_res = await db.execute(ingredient_query)
        ingredient = ingredient_res.scalars().first()

        if not ingredient:
            ingredient = Ingredient(
                id=uuid.uuid4(),
                name=new_name.title(),
                category=new_category,
            )
            db.add(ingredient)
            await db.flush()
        elif (
            request.category is not None
            and ingredient.category != request.category
        ):
            # Optionally update category of existing
            ingredient.category = request.category

        grocery_item.ingredient_id = ingredient.id
        grocery_item.ingredient = ingredient

    # 3. Update quantity if provided
    if request.quantity is not None:
        # Strip non-numeric suffix (e.g. "5g" → "5", "200ml" → "200")
        numeric_str = re.sub(r"[^\d.]", "", request.quantity)
        grocery_item.quantity = float(numeric_str) if numeric_str else None

    # 4. Update purchase state if provided
    if request.is_purchased is not None:
        grocery_item.is_purchased = request.is_purchased

    await db.commit()
    await db.refresh(grocery_item)

    return GroceryItemDTO(
        id=str(grocery_item.id),
        name=grocery_item.ingredient.name
        if grocery_item.ingredient
        else "Unknown",
        category=grocery_item.ingredient.category
        if grocery_item.ingredient
        else "Other",
        quantity=str(grocery_item.quantity) if grocery_item.quantity else "1",
        is_purchased=grocery_item.is_purchased,
    )


@router.delete("/{item_id}")
async def delete_grocery_item(
    item_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict[str, str]:
    """Delete a grocery item.

    Args:
        item_id (str): ID of the grocery item to delete.
        db (AsyncSession): Database session.
        current_user (User): Current user.

    Returns:
        dict[str, str]: Response message.

    Raises:
        HTTPException: If the grocery item is not found.
    """
    # Find the grocery item belonging to the current user
    query = select(GroceryItem).where(
        GroceryItem.id == item_id,
        GroceryItem.user_id == current_user.id,
    )
    result = await db.execute(query)
    item = result.scalars().first()

    if not item:
        raise HTTPException(status_code=404, detail="Grocery item not found")

    await db.delete(item)
    await db.commit()

    return {"status": "success", "message": "Grocery item deleted"}


# -------------
# Store listing
# -------------


@router.get("/stores/lotte")
async def list_lotte_branches():
    """Return all Lotte Mart branches."""
    return get_lotte_branches()


@router.get("/stores/winmart/provinces")
async def list_winmart_provinces():
    """Return distinct province names for WinMart stores."""
    return get_winmart_provinces()


@router.get("/stores/winmart")
async def list_winmart_stores(
    province: Annotated[
        str, Query(description="Province name to filter stores")
    ],
):
    """Return WinMart stores filtered by province."""
    return get_winmart_stores_by_province(province)


# --------------------
# Grocery List by Menu
# --------------------


@router.get("/by-menu", response_model=GroceryByMenuResponse)
async def get_grocery_list_grouped_by_menu(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> GroceryByMenuResponse:
    """Return grocery items grouped by meal plan for the current user.

    Args:
        db (AsyncSession): Database session.
        current_user (User): Current user.

    Returns:
        GroceryByMenuResponse: Grocery items grouped by meal plan.
    """
    grocery_result = await db.execute(
        select(GroceryItem)
        .options(
            selectinload(GroceryItem.ingredient),
            selectinload(GroceryItem.meal_plan),
        )
        .where(GroceryItem.user_id == current_user.id)
    )
    grocery_items = grocery_result.scalars().all()

    grouped: dict[str, GroceryMenuGroupDTO] = {}

    for item in grocery_items:
        plan = item.meal_plan
        if plan is not None:
            key = str(plan.id)
            meal_plan_id = str(plan.id)
            meal_plan_name = plan.name or "Unnamed menu"
            start_date = str(plan.start_date) if plan.start_date else None
            end_date = str(plan.end_date) if plan.end_date else None
            status = plan.status
        elif item.meal_plan_id is not None:
            # Handle dangling references gracefully so existing DB rows still
            # show in UI.
            key = str(item.meal_plan_id)
            meal_plan_id = str(item.meal_plan_id)
            meal_plan_name = "Archived menu"
            start_date = None
            end_date = None
            status = None
        else:
            key = "unassigned"
            meal_plan_id = None
            meal_plan_name = "Unassigned items"
            start_date = None
            end_date = None
            status = None

        if key not in grouped:
            grouped[key] = GroceryMenuGroupDTO(
                meal_plan_id=meal_plan_id,
                meal_plan_name=meal_plan_name,
                start_date=start_date,
                end_date=end_date,
                status=status,
                items=[],
            )

        grouped[key].items.append(
            GroceryItemDTO(
                id=str(item.id),
                name=item.ingredient.name if item.ingredient else "Unknown",
                category=item.ingredient.category
                if item.ingredient
                else "Other",
                quantity=format_quantity_grams(item.quantity),
                is_purchased=item.is_purchased,
            )
        )

    ordered_groups = sorted(
        grouped.values(),
        key=lambda group: (
            group.meal_plan_id is None,
            group.start_date or "9999-12-31",
            group.meal_plan_name.lower(),
        ),
    )

    return GroceryByMenuResponse(menus=ordered_groups)


@router.delete("/by-menu/{meal_plan_id}")
async def delete_grocery_items_by_menu(
    meal_plan_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict[str, str]:
    """Delete all grocery items for one meal plan group.

    Args:
        meal_plan_id (str): ID of the meal plan.
        db (AsyncSession): Database session.
        current_user (User): Current user.

    Returns:
        dict[str, str]: Response message.

    Raises:
        HTTPException: If the meal plan is not found.
    """
    if meal_plan_id == "unassigned":
        stmt = delete(GroceryItem).where(
            GroceryItem.user_id == current_user.id,
            GroceryItem.meal_plan_id.is_(None),
        )
    else:
        # Validate menu ownership before deleting to avoid touching unrelated
        # rows.
        plan_result = await db.execute(
            select(MealPlan).where(
                MealPlan.id == meal_plan_id,
                MealPlan.user_id == current_user.id,
            )
        )
        plan = plan_result.scalars().first()
        if not plan:
            raise HTTPException(status_code=404, detail="Menu not found")

        stmt = delete(GroceryItem).where(
            GroceryItem.user_id == current_user.id,
            GroceryItem.meal_plan_id == meal_plan_id,
        )

    delete_result = await db.execute(stmt)
    await db.commit()

    return {
        "status": "success",
        "deleted_count": int(delete_result.rowcount or 0),
    }


# --------
# Shopping
# --------


@router.post("/shopping/start", response_model=ShoppingOrderStartResponse)
async def start_shopping(
    payload: ShoppingRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ShoppingOrderStartResponse:
    """Start searching mart websites for grocery items in the background.

    Supports 3 strategies: lotte_priority, winmart_priority, cost_optimized.
    Uses FridgeCheckAgent to deduct fridge inventory before searching.

    Args:
        payload (ShoppingRequest): Request body with meal plan ID and strategy.
        background_tasks (BackgroundTasks): Background tasks for processing.
        db (AsyncSession): Database session.
        current_user (User): Current user.

    Returns:
        ShoppingOrderStartResponse: Response with order ID and status.

    Raises:
        HTTPException: If the meal plan is not found.
    """
    logger = logging.getLogger("nutri.api.routers.grocery")

    # 1. Validate meal plan ownership
    plan_result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == payload.meal_plan_id,
            MealPlan.user_id == current_user.id,
        )
    )
    plan = plan_result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Menu not found")

    # 2. Get unpurchased grocery items for this meal plan
    items_result = await db.execute(
        select(GroceryItem)
        .options(selectinload(GroceryItem.ingredient))
        .where(
            GroceryItem.user_id == current_user.id,
            GroceryItem.meal_plan_id == payload.meal_plan_id,
            GroceryItem.is_purchased == False,  # noqa: E712
        )
    )
    grocery_items = items_result.scalars().all()

    if not grocery_items:
        order = ShoppingOrder(
            user_id=current_user.id,
            meal_plan_id=payload.meal_plan_id,
            strategy=payload.strategy,
            status="completed",
            result_data={
                "items": [],
                "not_found": [],
                "fridge_covered": [],
                "total_estimated_cost": 0,
                "strategy": payload.strategy,
                "summary": "All items are already marked as purchased!",
            },
        )
        db.add(order)
        await db.commit()
        return ShoppingOrderStartResponse(
            order_id=str(order.id),
            status="completed",
            message="No items to buy",
        )

    # 3. Build raw grocery list
    raw_grocery = []
    for gi in grocery_items:
        name = gi.ingredient.name if gi.ingredient else "Unknown"
        qty = f"{gi.quantity}g" if gi.quantity else ""
        raw_grocery.append({"name": name, "quantity": qty})

    # 4. Load fridge inventory and run FridgeCheckAgent
    inv_result = await db.execute(
        select(UserInventory)
        .options(selectinload(UserInventory.ingredient))
        .where(UserInventory.user_id == current_user.id)
    )
    inventory_items = inv_result.scalars().all()
    raw_inventory = [
        {
            "name": inv.ingredient.name if inv.ingredient else "Unknown",
            "quantity": str(inv.quantity) if inv.quantity else "",
        }
        for inv in inventory_items
    ]

    agent = FridgeCheckAgent()
    fridge_result = await agent.acheck(raw_grocery, raw_inventory)

    # 5. Split into search_items (buy) and fridge_covered (skip)
    search_items = []
    fridge_covered = []
    for i, decision in enumerate(fridge_result.items):
        original = (
            raw_grocery[i]
            if i < len(raw_grocery)
            else {"name": decision.name, "quantity": ""}
        )

        if decision.action == "skip":
            fridge_covered.append({
                "name": decision.name,
                "fridge_quantity": decision.fridge_has,
                "required_quantity": original.get("quantity", ""),
            })
        else:
            search_items.append({
                "name": decision.name,
                "quantity": decision.buy_quantity
                or original.get("quantity", ""),
                "original_quantity": original.get("quantity", ""),
                "fridge_deducted": decision.fridge_has,
            })

    # If everything is covered by fridge
    if not search_items:
        order = ShoppingOrder(
            user_id=current_user.id,
            meal_plan_id=payload.meal_plan_id,
            strategy=payload.strategy,
            status="completed",
            result_data={
                "items": [],
                "not_found": [],
                "fridge_covered": fridge_covered,
                "total_estimated_cost": 0,
                "strategy": payload.strategy,
                "summary": f"Fridge has enough {len(fridge_covered)} ingredients!",
            },
        )
        db.add(order)
        await db.commit()
        return ShoppingOrderStartResponse(
            order_id=str(order.id),
            status="completed",
            message="All covered by fridge",
        )

    for item in fridge_covered:
        logger.info(
            "Fridge covered item: %s | available: %s | needed: %s",
            item["name"],
            item["fridge_quantity"],
            item["required_quantity"],
        )

    logger.info(
        "Shopping search start | user=%s | plan=%s | strategy=%s | to_buy=%d | "
        " fridge_covered=%d | lotte=%s | winmart=%s/%s",
        current_user.id,
        payload.meal_plan_id,
        payload.strategy,
        len(search_items),
        len(fridge_covered),
        payload.lotte_branch_id,
        payload.winmart_store_code,
        payload.winmart_store_group_code,
    )

    # 6. Create processing ShoppingOrder
    order = ShoppingOrder(
        user_id=current_user.id,
        meal_plan_id=payload.meal_plan_id,
        strategy=payload.strategy,
        status="processing",
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    # 7. Add background task
    background_tasks.add_task(
        process_shopping_background,
        order_id=order.id,
        search_items=search_items,
        fridge_covered=fridge_covered,
        strategy=payload.strategy,
        lotte_branch_id=payload.lotte_branch_id,
        winmart_store_code=payload.winmart_store_code,
        winmart_store_group_code=payload.winmart_store_group_code,
    )

    return ShoppingOrderStartResponse(
        order_id=str(order.id),
        status="processing",
        message="Background matching started",
    )


@router.get("/shopping/history", response_model=ShoppingHistoryResponse)
async def get_shopping_history(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ShoppingHistoryResponse:
    """Get the shopping history for the current user.

    Args:
        db (AsyncSession): Database session.
        current_user (User): Current user.

    Returns:
        ShoppingHistoryResponse: Response with shopping history.
    """
    result = await db.execute(
        select(ShoppingOrder)
        .where(ShoppingOrder.user_id == current_user.id)
        .order_by(ShoppingOrder.ordered_at.desc())
    )
    orders = result.scalars().all()

    total_trips = len(orders)
    total_spent = sum(
        float(o.total_amount or 0) for o in orders if o.status == "completed"
    )

    total_items = 0
    history_items = []

    for o in orders:
        items_count = 0
        current_amount = 0.0

        if o.result_data:
            items_count = len(o.result_data.get("items", []))

            # Use total_estimated_cost if total_amount is not present
            if o.total_amount is None:
                current_amount = float(
                    o.result_data.get("total_estimated_cost", 0)
                )
            else:
                current_amount = float(o.total_amount)
        else:
            current_amount = float(o.total_amount or 0)

        if o.status == "completed":
            total_items += items_count

        history_items.append(
            ShoppingHistoryItemDTO(
                id=str(o.id),
                date=o.ordered_at.isoformat() if o.ordered_at else "",
                items_count=items_count,
                cost=current_amount,
                currency=o.currency or "VND",
                status=o.status,
            )
        )

    completed_trips = sum(1 for o in orders if o.status == "completed")
    avg_items = (total_items // completed_trips) if completed_trips > 0 else 0
    avg_cost = (total_spent / completed_trips) if completed_trips > 0 else 0.0

    return ShoppingHistoryResponse(
        total_trips=total_trips,
        total_spent=float(total_spent),
        avg_items=int(avg_items),
        avg_cost=float(avg_cost),
        history=history_items,
    )


@router.get("/shopping/order/{order_id}", response_model=ShoppingOrderResponse)
async def get_shopping_order(
    order_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ShoppingOrderResponse:
    """Get a specific shopping order by ID.

    Args:
        order_id (str): ID of the order to retrieve.
        db (AsyncSession): Database session.
        current_user (User): Current user.

    Returns:
        ShoppingOrderResponse: Response with shopping order details.

    Raises:
        HTTPException: If the order is not found or the ID format is invalid.
    """
    try:
        oid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid order ID format")

    result = await db.execute(
        select(ShoppingOrder).where(
            ShoppingOrder.id == oid, ShoppingOrder.user_id == current_user.id
        )
    )
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return ShoppingOrderResponse(
        order_id=str(order.id),
        status=order.status,
        result_data=order.result_data,
    )


@router.get(
    "/shopping/latest/{meal_plan_id}", response_model=ShoppingOrderResponse
)
async def get_latest_shopping_order(
    meal_plan_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ShoppingOrderResponse:
    """Get the latest shopping order for a specific meal plan.

    Args:
        meal_plan_id (str): ID of the meal plan.
        db (AsyncSession): Database session.
        current_user (User): Current user.

    Returns:
        ShoppingOrderResponse: Response with shopping order details.

    Raises:
        HTTPException: If the meal plan ID format is invalid or no order is found.
    """
    try:
        mpid = uuid.UUID(meal_plan_id)
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid meal plan ID format"
        )

    result = await db.execute(
        select(ShoppingOrder)
        .where(
            ShoppingOrder.meal_plan_id == mpid,
            ShoppingOrder.user_id == current_user.id,
        )
        .order_by(ShoppingOrder.ordered_at.desc())
    )
    order = result.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="No shopping order found")

    return ShoppingOrderResponse(
        order_id=str(order.id),
        status=order.status,
        result_data=order.result_data,
    )


@router.post("/shopping/notification/{order_id}/read")
async def mark_shopping_notification_read(
    order_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, bool]:
    """Mark a shopping order notification as read.

    Args:
        order_id (str): ID of the order.
        current_user (User): Current user.
        db (AsyncSession): Database session.

    Returns:
        dict[str, bool]: Dictionary with status.
    """
    result = await db.execute(
        select(ShoppingOrder).where(
            ShoppingOrder.id == uuid.UUID(order_id),
            ShoppingOrder.user_id == current_user.id,
        )
    )
    order = result.scalars().first()
    if order:
        order.notification_read = True
        await db.commit()
    return {"ok": True}
