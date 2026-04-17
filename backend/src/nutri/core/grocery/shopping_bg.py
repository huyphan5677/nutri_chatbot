# Copyright (c) 2026 Nutri. All rights reserved.
"""Background processing for grocery shopping."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from sqlalchemy.future import select

from nutri.core.db.session import async_session_maker
from nutri.core.grocery.models import ShoppingOrder
from nutri.core.grocery.mart_search import execute_strategy


if TYPE_CHECKING:
    import uuid


logger = logging.getLogger("nutri.core.grocery.shopping_bg")


async def process_shopping_background(
    order_id: uuid.UUID,
    search_items: list[dict[str, Any]],
    strategy: str,
    fridge_covered: list[dict[str, Any]] | None = None,
    lotte_branch_id: str = "nsg",
    winmart_store_code: str = "1535",
    winmart_store_group_code: str = "1998",
) -> None:
    """Execute shopping strategy in the background and save results."""
    logger.info("Starting background shopping for order %s", order_id)

    try:
        from nutri.core.grocery.mart_search import optimize_search_terms

        # Preprocess names using LLM to remove verbs/adjectives
        item_names = [item["name"] for item in search_items]
        optimized_names = await optimize_search_terms(item_names)

        for i, item in enumerate(search_items):
            item["search_name"] = (
                optimized_names[i] if i < len(optimized_names) else item["name"]
            )

        # Execute the search strategy via direct mart APIs
        result = await execute_strategy(
            items=search_items,
            strategy=strategy,
            lotte_branch_id=lotte_branch_id,
            winmart_store_code=winmart_store_code,
            winmart_store_group_code=winmart_store_group_code,
        )

        # Determine status and summary
        total = result["total_estimated_cost"]
        found_count = len(result["found"])
        total_count = len(search_items)
        not_found_list = result["not_found"]

        saved_count = len(fridge_covered) if fridge_covered else 0
        if total > 0:
            summary = f"Found {found_count}/{total_count} items, {saved_count} saved from fridge, total ≈ {total:,.0f}₫"
        else:
            summary = f"Found {found_count}/{total_count} items, {saved_count} saved from fridge"

        if not_found_list:
            summary += f" ({len(not_found_list)} not found)"

        # Build per-item fridge_deducted lookup from search_items
        fridge_deducted_map: dict[str, str] = {}
        for si in search_items:
            if si.get("fridge_deducted"):
                fridge_deducted_map[si["name"]] = si["fridge_deducted"]

        # Prepare result data payload
        result_data = {
            "items": [
                {
                    "ingredient_name": p.ingredient_name,
                    "quantity": p.quantity,
                    "required_quantity": p.required_quantity,
                    "package_size": p.package_size,
                    "fridge_quantity": p.fridge_quantity,
                    "fridge_deducted": p.fridge_deducted,
                    "original_quantity": p.original_quantity,
                    "buy_quantity": p.buy_quantity,
                    "product_name": p.product_name,
                    "price": p.price,
                    "stock": p.stock,
                    "product_url": p.product_url,
                    "source_mart": p.source_mart,
                    "description": p.description,
                }
                for p in result["found"]
            ],
            "not_found": not_found_list,
            "fridge_covered": fridge_covered or [],
            "total_estimated_cost": total,
            "strategy": strategy,
            "summary": summary,
        }

        # Debug log buy_quantity for each item
        for item_data in result_data["items"]:
            logger.info(
                "Result item: %s | qty=%s | buy_qty=%s | price=%s",
                item_data["ingredient_name"],
                item_data["required_quantity"],
                item_data["buy_quantity"],
                item_data["price"],
            )

        # Save to DB
        async with async_session_maker() as db:
            result_db = await db.execute(
                select(ShoppingOrder).where(ShoppingOrder.id == order_id)
            )
            order = result_db.scalars().first()
            if order:
                order.status = "completed"
                order.total_amount = total
                order.result_data = result_data
                await db.commit()
                logger.info(
                    "Successfully saved background shopping results for order %s",
                    order_id,
                )
            else:
                logger.error(
                    "ShoppingOrder %s not found upon completion", order_id
                )

    except Exception as e:
        logger.exception("Error in background shopping for order %s", order_id)
        async with async_session_maker() as db:
            result_db = await db.execute(
                select(ShoppingOrder).where(ShoppingOrder.id == order_id)
            )
            order = result_db.scalars().first()
            if order:
                order.status = "failed"
                order.result_data = {
                    "summary": f"Server error: {e!s}",
                    "items": [],
                    "not_found": [],
                    "total_estimated_cost": 0,
                    "strategy": strategy,
                }
                await db.commit()
