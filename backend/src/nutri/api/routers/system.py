import logging
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from nutri.api.dependencies import get_current_user
from nutri.core.auth.models import User
from nutri.core.chat.models import ChatMessage, ChatSession
from nutri.core.db.session import get_db
from nutri.core.grocery.models import GroceryItem, ShoppingOrder, UserInventory
from nutri.core.menus.models import MealPlan
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

router = APIRouter()
logger = logging.getLogger("nutri.api.routers.system")


BACKEND_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
LOGS_DIR = BACKEND_DIR / "logs"


class StatusUnreadSession(BaseModel):
    id: str
    title: str


class ShoppingNotification(BaseModel):
    order_id: str
    status: str  # "completed" | "failed"
    meal_plan_name: str | None = None
    is_read: bool = False


class DashboardStatusResponse(BaseModel):
    unread_count: int
    unread_sessions: list[StatusUnreadSession]
    grocery_count: int
    inventory_count: int
    menu_count: int
    shopping_notifications: list[ShoppingNotification] = []


@router.get("/health")
async def health_check():
    """Check if the system is healthy."""
    logger.info("Health check called")
    return {"status": "ok"}


@router.get("/dashboard-status", response_model=DashboardStatusResponse)
async def get_dashboard_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return lightweight navbar counters in a single API call."""

    unread_result = await db.execute(
        select(ChatSession)
        .join(ChatMessage, ChatSession.id == ChatMessage.session_id)
        .where(ChatSession.user_id == current_user.id)
        .where(ChatMessage.message_type == "ai")
        .where(ChatMessage.is_read == False)
        .distinct()
    )
    unread_sessions = unread_result.scalars().all()

    grocery_result = await db.execute(
        select(GroceryItem)
        .where(GroceryItem.user_id == current_user.id)
        .where(GroceryItem.is_purchased == False)
    )
    unpurchased_items = grocery_result.scalars().all()

    inventory_result = await db.execute(
        select(UserInventory).where(UserInventory.user_id == current_user.id)
    )
    inventory_items = inventory_result.scalars().all()

    menu_result = await db.execute(
        select(MealPlan).where(MealPlan.user_id == current_user.id)
    )
    menus = menu_result.scalars().all()

    # Shopping order notifications - recently completed or failed
    from datetime import datetime, timedelta, timezone

    cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
    shopping_result = await db.execute(
        select(ShoppingOrder)
        .where(
            ShoppingOrder.user_id == current_user.id,
            ShoppingOrder.status.in_(["completed", "failed"]),
            ShoppingOrder.notification_read == False,
            ShoppingOrder.ordered_at >= cutoff,
        )
        .order_by(ShoppingOrder.ordered_at.desc())
    )
    recent_orders = shopping_result.scalars().all()

    # Build meal plan name map
    mp_ids = [o.meal_plan_id for o in recent_orders if o.meal_plan_id]
    mp_name_map: dict = {}
    if mp_ids:
        mp_result = await db.execute(select(MealPlan).where(MealPlan.id.in_(mp_ids)))
        for mp in mp_result.scalars().all():
            mp_name_map[mp.id] = mp.name

    return DashboardStatusResponse(
        unread_count=len(unread_sessions),
        unread_sessions=[
            StatusUnreadSession(id=str(s.id), title=s.title or "New Chat")
            for s in unread_sessions
        ],
        grocery_count=len(unpurchased_items),
        inventory_count=len(inventory_items),
        menu_count=len(menus),
        shopping_notifications=[
            ShoppingNotification(
                order_id=str(o.id),
                status=o.status,
                meal_plan_name=mp_name_map.get(o.meal_plan_id, "Menu"),
                is_read=bool(o.notification_read),
            )
            for o in recent_orders
        ],
    )


@router.get("/logs", response_model=List[str])
async def get_system_logs(
    type: str = Query("app", description="Log type: 'app' or 'ai'"),
    lines: int = Query(100, description="Number of tail lines to fetch"),
    current_user: User = Depends(get_current_user),
):
    """
    Reads the tail of the requested log file.
    Restricted to authenticated users (and ideally admins later).
    """

    # Map 'type' parameter to actual filename
    if type == "app":
        filename = "nutri.log"
    elif type == "ai":
        filename = "ai_agent.log"
    else:
        raise HTTPException(
            status_code=400, detail="Invalid log type. Use 'app' or 'ai'."
        )

    file_path = LOGS_DIR / filename

    if not file_path.exists():
        return [
            f"Log file not found: {filename} at {file_path}. It has not been created yet."
        ]

    try:
        # Read the file and return the last N lines
        # This is a simple python tail implementation for medium sized files
        with open(file_path, "r", encoding="utf-8") as f:
            all_lines = f.readlines()

        # Return tail
        tail_lines = all_lines[-lines:] if lines > 0 else all_lines
        return [line.rstrip("\n") for line in tail_lines]

    except Exception as e:
        logger.error(f"Error reading logs: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server error reading logs."
        )
