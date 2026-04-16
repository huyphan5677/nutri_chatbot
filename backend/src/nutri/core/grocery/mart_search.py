# Copyright (c) 2026 Nutri. All rights reserved.
"""Mart search service using direct Lotte Mart & WinMart product APIs.

Searches product catalogs directly via HTTP POST, returning structured
product data with real prices (no regex scraping).
"""

from __future__ import annotations

import re
import asyncio
import logging
from typing import Literal

import httpx
from pydantic import Field, BaseModel


logger = logging.getLogger("nutri.core.grocery.mart_search")

# -----------
# Data models
# -----------


class ShoppingProduct(BaseModel):
    """A matched product for a grocery ingredient."""

    ingredient_name: str
    quantity: str | None = None
    required_quantity: str = ""
    package_size: str = ""
    fridge_quantity: str = ""
    fridge_deducted: str = ""
    original_quantity: str = ""
    buy_quantity: int = 1
    product_name: str = ""
    price: float | None = None
    stock: float = 0
    product_url: str = ""
    source_mart: str = ""
    description: str = ""


class OptimizedIngredient(BaseModel):
    index: int = Field(
        description="The index of the ingredient in the input list.",
    )
    original: str = Field(description="The original name of the ingredient.")
    optimized: str = Field(
        description="The simplified name of the ingredient for searching."
    )


class OptimizedIngredients(BaseModel):
    items: list[OptimizedIngredient] = Field(
        description="An array of optimized ingredients, maintaining the original order and quantity."
    )


async def optimize_search_terms(items: list[str]) -> list[str]:
    """Using LLM to optimize search terms."""
    if not items:
        return []

    try:
        from nutri.ai.llm_client import get_llm

        llm = get_llm().with_structured_output(OptimizedIngredients)

        numbered_list = "\n".join(
            f"[{i}] {item}" for i, item in enumerate(items)
        )

        # Hardcode language to Vietnamese because lottemart, winmart only support Vietnamese
        # language = detect_user_language(items[0])
        language = "Vietnamese"

        prompt = f"""You are a shopping assistant for grocery stores.
        Language: {language}. Must respond in {language}.
Task: Take a numbered list of raw ingredient names, and convert them into the most basic, concise product names suitable for searching on grocery store websites.
Example transformations (english):
- "Fresh lemon juice" → "Lemon"
- "Soft-cooked black beans" → "Black beans"
- "Thinly sliced beef (for stir-fry)" → "Beef"
- "Pure honey (optional)" → "Honey"

Example transformations (vietnamese):
- "Chanh tươi vắt" → "Chanh"
- "Đậu đen nấu mềm" → "Đậu đen"
- "Thịt bò (thái lát mỏng)" → "Thịt bò"
- "Mật ong nguyên chất (tùy chọn)" → "Mật ong"

Input list ({len(items)} items):
{numbered_list}

REQUIREMENTS:
1. Return EXACTLY {len(items)} items with index from 0 to {len(items) - 1}
2. Each item must maintain its corresponding index
3. The "original" field must match the exact original name
4. The "optimized" field is the simplified name for searching
"""
        result = await llm.ainvoke(prompt)

        # Build index-based map for safety
        optimized_map: dict[int, str] = {}
        for item in result.items:
            if 0 <= item.index < len(items):
                optimized_map[item.index] = item.optimized

        # Reconstruct list preserving order, fallback to original if missing
        output = []
        for i, original in enumerate(items):
            optimized = optimized_map.get(i, original)
            if optimized != original:
                logger.debug(
                    "Optimize ingredient [%d]: '%s' → '%s'",
                    i,
                    original,
                    optimized,
                )
            output.append(optimized)

        return output
    except Exception as e:
        logger.error("Failed to optimize search terms: %s", e)
        return items


# ------------------------------
# Direct API search – Lotte Mart
# ------------------------------

_HTTP_TIMEOUT = 10.0


async def search_lotte_api(
    query: str, branch_id: str = "nsg", top_n: int = 5
) -> list[ShoppingProduct]:
    """Search Lotte Mart product catalog via their internal API."""
    url = (
        f"https://www.lottemart.vn/v1/p/mart/es/vi_{branch_id}/products/search"
    )
    payload = {
        "limit": 10,
        "offset": 1,
        "facet_filters": {},
        "fields": [
            "id",
            "sku",
            "name",
            "price",
            "in_stock",
            "stock_qty",
            "product_url",
            "description",
        ],
        "where": {"query": query},
    }

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

        items_list = data.get("data", {}).get("items", [])
        products: list[ShoppingProduct] = []

        for p in items_list:
            # Filter out out-of-stock items
            if p.get("in_stock") != 1 and p.get("stock_qty", 0) <= 0:
                continue

            # Extract price from structured JSON (no regex needed)
            price = p.get("price", {}).get("VND", {}).get("default", 0)

            # Build product URL
            product_url = p.get(
                "product_url",
                f"https://www.lottemart.vn/product/{p.get('sku', '')}",
            )

            # Clean HTML from description
            desc_html = str(p.get("description") or "")
            desc_clean = re.sub(r"<[^>]*>", " ", desc_html)
            desc_clean = re.sub(r"\s+", " ", desc_clean).strip()[:200]

            products.append(
                ShoppingProduct(
                    ingredient_name="",  # filled later by caller
                    product_name=p.get("name", "Unknown Lotte Item"),
                    price=float(price) if price else None,
                    stock=p.get("stock_qty", 0),
                    product_url=product_url,
                    source_mart="Lotte",
                    description=desc_clean,
                )
            )

            if len(products) >= top_n:
                break

        logger.debug(
            "Lotte API search '%s' branch=%s → %d results",
            query,
            branch_id,
            len(products),
        )
        return products

    except Exception as e:
        logger.error("Lotte API search failed for '%s': %s", query, e)
        return []


# ---------------------------
# Direct API search – WinMart
# ---------------------------


async def search_winmart_api(
    query: str,
    store_code: str = "1535",
    store_group_code: str = "1998",
    top_n: int = 5,
) -> list[ShoppingProduct]:
    """Search WinMart product catalog via their internal API."""
    url = "https://api-crownx.winmart.vn/ss/api/v2/public/winmart/item-search"
    payload = {
        "keyword": query,
        "pageNumber": 1,
        "pageSize": 20,
        "applicationType": "Winmart",
        "storeGroupCode": store_group_code,
        "storeNo": store_code,
    }
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Origin": "https://winmart.vn",
        "Referer": "https://winmart.vn/",
        "User-Agent": "Mozilla/5.0",
        "x-api-merchant": "WCM",
    }

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        items_list = data.get("data", [])
        products: list[ShoppingProduct] = []

        for item in items_list:
            stock = item.get("warehouse", {}).get("availableQuantity", 0)
            if stock <= 0:
                continue

            price_data = item.get("price", {})
            price = price_data.get("salePrice", price_data.get("listPrice", 0))
            name = item.get(
                "description", item.get("name", "Unknown Winmart Item")
            )
            uom = item.get("uomName", "")
            seoName = item.get("seoName", "")
            product_url = f"https://winmart.vn/products/{seoName}"

            products.append(
                ShoppingProduct(
                    ingredient_name="",  # filled later by caller
                    product_name=name,
                    price=float(price) if price else None,
                    stock=stock,
                    product_url=product_url,
                    source_mart="Winmart",
                    description=uom or "",
                )
            )

            if len(products) >= top_n:
                break

        logger.debug(
            "WinMart API search '%s' store=%s → %d results",
            query,
            store_code,
            len(products),
        )
        return products

    except Exception as e:
        logger.error("WinMart API search failed for '%s': %s", query, e)
        return []


# ------------------
# Strategy execution
# ------------------


async def execute_strategy(
    items: list[
        dict
    ],  # [{name: str, quantity: str | None, search_name: str}, ...]
    strategy: Literal["lotte_priority", "winmart_priority", "cost_optimized"],
    lotte_branch_id: str = "nsg",
    winmart_store_code: str = "1535",
    winmart_store_group_code: str = "1998",
) -> dict:
    """Execute a shopping strategy for a list of grocery items.

    Returns dict:
      found: list[ShoppingProduct]
      not_found: list[str]
      total_estimated_cost: float

    Raises:
        ValueError: If the strategy is invalid.
    """
    found: list[ShoppingProduct] = []
    not_found: list[str] = []

    if strategy == "lotte_priority":
        found, not_found = await _strategy_priority(
            items,
            primary="lotte",
            lotte_branch_id=lotte_branch_id,
            winmart_store_code=winmart_store_code,
            winmart_store_group_code=winmart_store_group_code,
        )
    elif strategy == "winmart_priority":
        found, not_found = await _strategy_priority(
            items,
            primary="winmart",
            lotte_branch_id=lotte_branch_id,
            winmart_store_code=winmart_store_code,
            winmart_store_group_code=winmart_store_group_code,
        )
    elif strategy == "cost_optimized":
        found, not_found = await _strategy_cost_optimized(
            items,
            lotte_branch_id=lotte_branch_id,
            winmart_store_code=winmart_store_code,
            winmart_store_group_code=winmart_store_group_code,
        )
    else:
        raise ValueError(f"Unknown strategy: {strategy}")

    total = sum(
        (p.price or 0) * p.buy_quantity for p in found if p.price is not None
    )

    return {
        "found": found,
        "not_found": not_found,
        "total_estimated_cost": total,
    }


async def _strategy_priority(
    items: list[dict],
    primary: Literal["lotte", "winmart"],
    lotte_branch_id: str = "nsg",
    winmart_store_code: str = "1535",
    winmart_store_group_code: str = "1998",
) -> tuple[list[ShoppingProduct], list[str]]:
    """Search primary mart first, then fallback for missing items."""
    from nutri.core.grocery.product_validator import pick_best_product

    found: list[ShoppingProduct] = []
    missing_items: list[dict] = []

    semaphore = asyncio.Semaphore(5)

    async def _process_phase1(
        item: dict,
    ) -> tuple[dict, ShoppingProduct | None]:
        async with semaphore:
            name = item["name"]
            search_name = item.get("search_name", name)
            qty = item.get("quantity", "")
            logger.info(
                "[Phase 1] '%s' (qty=%s) → search='%s' on %s",
                name,
                qty,
                search_name,
                primary,
            )

            if primary == "lotte":
                candidates = await search_lotte_api(
                    search_name, lotte_branch_id
                )
            else:
                candidates = await search_winmart_api(
                    search_name, winmart_store_code, winmart_store_group_code
                )
            product = await pick_best_product(
                name, candidates, required_quantity=qty
            )
            if product:
                product.ingredient_name = name
                product.quantity = qty
                product.fridge_deducted = item.get("fridge_deducted", "")
                product.original_quantity = item.get("original_quantity", "")
            return item, product

    if items:
        phase1_tasks = [_process_phase1(item) for item in items]
        phase1_results = await asyncio.gather(*phase1_tasks)
        for item, product in phase1_results:
            if product:
                found.append(product)
            else:
                missing_items.append(item)

    # --- Phase 2: Fallback for missing items ---
    still_not_found: list[str] = []

    async def _process_phase2(
        item: dict,
    ) -> tuple[dict, ShoppingProduct | None]:
        async with semaphore:
            name = item["name"]
            search_name = item.get("search_name", name)
            qty = item.get("quantity", "")
            logger.info(
                "[Phase 2] '%s' (qty=%s) → search='%s' (fallback)",
                name,
                qty,
                search_name,
            )

            if primary == "lotte":
                candidates = await search_winmart_api(
                    search_name, winmart_store_code, winmart_store_group_code
                )
            else:
                candidates = await search_lotte_api(
                    search_name, lotte_branch_id
                )

            product = await pick_best_product(
                name, candidates, required_quantity=qty
            )
            if product:
                product.ingredient_name = name
                product.quantity = qty
                product.fridge_deducted = item.get("fridge_deducted", "")
                product.original_quantity = item.get("original_quantity", "")
            return item, product

    if missing_items:
        phase2_tasks = [_process_phase2(item) for item in missing_items]
        phase2_results = await asyncio.gather(*phase2_tasks)
        for item, product in phase2_results:
            if product:
                found.append(product)
            else:
                still_not_found.append(item["name"])

    return found, still_not_found


async def _strategy_cost_optimized(
    items: list[dict],
    lotte_branch_id: str = "nsg",
    winmart_store_code: str = "1535",
    winmart_store_group_code: str = "1998",
) -> tuple[list[ShoppingProduct], list[str]]:
    """Search both marts, use LLM to pick optimal price/relevance for each item."""
    from nutri.core.grocery.product_validator import pick_cost_optimized

    found: list[ShoppingProduct] = []
    not_found: list[str] = []

    semaphore = asyncio.Semaphore(5)

    async def _process_cost(item: dict) -> tuple[str, ShoppingProduct | None]:
        async with semaphore:
            name = item["name"]
            search_name = item.get("search_name", name)
            qty = item.get("quantity", "")
            logger.info(
                "[CostOpt] '%s' (qty=%s) → search='%s' on both",
                name,
                qty,
                search_name,
            )

            lotte_results, winmart_results = await asyncio.gather(
                search_lotte_api(search_name, lotte_branch_id),
                search_winmart_api(
                    search_name, winmart_store_code, winmart_store_group_code
                ),
            )

            all_candidates = lotte_results + winmart_results
            if not all_candidates:
                return name, None

            product = await pick_cost_optimized(
                name, all_candidates, required_quantity=qty
            )
            if product:
                product.ingredient_name = name
                product.quantity = qty
                product.fridge_deducted = item.get("fridge_deducted", "")
                product.original_quantity = item.get("original_quantity", "")
            return name, product

    if items:
        tasks = [_process_cost(item) for item in items]
        results = await asyncio.gather(*tasks)
        for name, product in results:
            if product:
                found.append(product)
            else:
                not_found.append(name)

    return found, not_found
