# Copyright (c) 2026 Nutri. All rights reserved.
"""LLM-based product validation for grocery shopping results.

Uses LLM to verify that search results actually match the ingredient
being searched for, and to pick the optimal product in cost-optimized mode.
Now also considers required quantity vs product packaging/stock to decide
how many units to buy.
"""

from __future__ import annotations

import re
import asyncio
import logging

from pydantic import Field, BaseModel


logger = logging.getLogger("nutri.core.grocery.product_validator")


class ValidationResult(BaseModel):
    """LLM output for product validation."""

    best_index: int = Field(
        description="Index (0-based) of the best matching product, or -1 if none match the ingredient."
    )
    buy_quantity: int = Field(
        default=1,
        description="Number of units to buy from the store (positive integer, >= 1).",
    )
    package_size: str = Field(
        default="",
        description="The weight or volume of a single unit of the product (e.g., '700g', '1L', '50g'). Return empty if unknown.",
    )
    fridge_quantity: str = Field(
        default="",
        description="The weight or volume of the remaining portion after cooking that needs to be stored in the refrigerator, clearly displaying the quantity and unit (e.g., '600g').",
    )
    reason: str = Field(
        default="",
        description="Brief reason for the choice.",
    )


class CostOptResult(BaseModel):
    """LLM output for cost-optimized product selection."""

    best_index: int = Field(
        description="Index (0-based) of the best product considering both relevance and price, or -1 if none match."
    )
    buy_quantity: int = Field(
        default=1,
        description="Number of units to buy from the store (positive integer, >= 1).",
    )
    package_size: str = Field(
        default="",
        description="The weight or volume of a single unit of the product (e.g., '700g', '1L', '50g'). Return empty if unknown.",
    )
    fridge_quantity: str = Field(
        default="",
        description="The weight or volume of the remaining portion after cooking that needs to be stored in the refrigerator, clearly displaying the quantity and unit (e.g., '600g').",
    )
    reason: str = Field(
        default="",
        description="Brief reason for the choice.",
    )


async def pick_best_product(
    ingredient: str,
    candidates: list,
    required_quantity: str = "",
) -> object | None:
    """Use LLM to validate which candidate actually matches the ingredient.

    Args:
        ingredient: The ingredient name being searched for.
        candidates: List of ShoppingProduct objects from API search.
        required_quantity: How much the recipe needs (e.g. "150g", "0.5kg").

    Returns:
        The best matching ShoppingProduct, or None if no match.
    """
    if not candidates:
        logger.debug("No candidates for '%s'", ingredient)
        return None

    # If only 1 candidate, still validate via LLM
    try:
        from nutri.ai.llm_client import get_llm

        llm = get_llm().with_structured_output(ValidationResult)

        product_list = "\n".join(
            f"[{i}] {p.product_name} | Giá: {p.price}₫ | Tồn kho: {p.stock} | Siêu thị: {p.source_mart} | Mô tả: {p.description[:100]}"
            for i, p in enumerate(candidates)
        )

        qty_context = (
            f'\nQUANTITY NEEDED ACCORDING TO THE RECIPE: "{required_quantity}"'
            if required_quantity
            else ""
        )

        prompt = f"""You are a smart grocery shopping assistant.
INGREDIENT TO FIND: "{ingredient}"{qty_context}

LIST OF PRODUCTS FROM THE SUPERMARKET:
{product_list}

TASK: Select the most suitable product and calculate the quantity to buy.

PRODUCT SELECTION RULES:
1. The product MUST be "{ingredient}" (e.g., searching for "Beef" but the result is "Fish Sauce" → -1)
2. Prioritize products with reasonable prices and available stock (stock > 0)
3. If no suitable product is found → best_index = -1

QUANTITY CALCULATION RULES (buy_quantity):
- The quantity needed according to the recipe is usually SMALL and ODD (e.g., 150g, 200ml, 0.3kg)
- Supermarkets sell in nguyên units (1 pack, 1 box, 1 kg...)
- Base on the product name/description to infer the weight/volume of each unit
- Base on the product name/description to infer the weight/volume of each unit (save to package_size). Most importantly: try YOUR BEST to convert package_size to the SAME UNIT as the required quantity (e.g., Need 800g, product is 1kg -> package_size="1000g" instead of "1kg" for easier calculation).
- Calculate: buy_quantity = ceil(required_quantity / unit_size)
- Calculate: fridge_quantity = (package_size * buy_quantity) - required_quantity. (If <= 0, write '0'). Clearly write the answer with units (e.g., '600g').
- buy_quantity MUST be >= 1 and be a positive integer
- If the quantity cannot be determined → buy_quantity = 1, package_size = "", fridge_quantity = ""
- Ensure buy_quantity <= stock (do not buy more than stock)
"""
        result = await llm.ainvoke(prompt)

        if result.best_index < 0 or result.best_index >= len(candidates):
            logger.info(
                "LLM validation: no match for '%s' | reason=%s",
                ingredient,
                result.reason,
            )
            return None

        chosen = candidates[result.best_index]
        buy_qty = max(1, result.buy_quantity)
        # Don't exceed stock
        if chosen.stock > 0:
            buy_qty = min(buy_qty, chosen.stock)
        chosen.buy_quantity = buy_qty
        chosen.required_quantity = required_quantity
        chosen.package_size = result.package_size
        chosen.fridge_quantity = result.fridge_quantity

        logger.info(
            "LLM validation: '%s' (need=%s) → '%s' (%s₫ × %d) | reason=%s",
            ingredient,
            required_quantity,
            chosen.product_name,
            chosen.price,
            buy_qty,
            result.reason,
        )
        return chosen

    except Exception:
        logger.exception("LLM validation failed for '%s'", ingredient)
        # Fallback: return first candidate without validation
        if candidates:
            candidates[0].required_quantity = required_quantity
            return candidates[0]
        return None


async def pick_cost_optimized(
    ingredient: str,
    candidates: list,
    required_quantity: str = "",
) -> object | None:

    if not candidates:
        return None

    from nutri.ai.language import detect_user_language
    from nutri.ai.llm_client import get_llm

    language = detect_user_language(candidates[0].product_name)
    qty_context = (
        f'\nSỐ LƯỢNG CẦN MUA THEO CÔNG THỨC: "{required_quantity}"'
        if required_quantity
        else ""
    )

    product_list = "\n".join(
        f"[{i}] {p.product_name} | Giá: {p.price}₫ | Tồn kho: {p.stock} | Siêu thị: {p.source_mart} | Mô tả: {p.description[:100] if p.description else ''}"
        for i, p in enumerate(candidates)
    )

    if language == "vi":
        prompt = f"""Bạn là trợ lý tối ưu chi phí đi chợ.

NGUYÊN LIỆU CẦN MUA: "{ingredient}"{qty_context}

DANH SÁCH SẢN PHẨM TỪ NHIỀU SIÊU THỊ:
{product_list}

NHIỆM VỤ: Chọn sản phẩm TỐI ƯU NHẤT xét cả tính phù hợp, giá cả và số lượng.

QUY TẮC CHỌN SẢN PHẨM:
1. Sản phẩm PHẢI thực sự phù hợp với nguyên liệu "{ingredient}"
2. Nếu không có sản phẩm phù hợp → best_index = -1

QUY TẮC TÍNH SỐ LƯỢNG (buy_quantity):
- Số lượng cần mua theo công thức thường NHỎ và LẺ (VD: 150g, 200ml, 0.3kg)
- Siêu thị bán theo đơn vị nguyên (1 gói, 1 hộp, 1 kg...)
- Dựa vào tên/mô tả sản phẩm để suy ra trọng lượng/thể tích mỗi đơn vị (lưu vào biến package_size).
- Tối quan trọng: hãy HẾT SỨC CỐ GẮNG QUY ĐỔI package_size về CÙNG ĐƠN VỊ với số lượng cần thiết (VD: Cần 800g, sản phẩm 1kg -> package_size="1000g" thay vì "1kg").
- Tính: buy_quantity = ceil(số_lượng_cần / dung_lượng_mỗi_đơn_vị)
- Tính: fridge_quantity = (package_size * buy_quantity) - số_lượng_cần. (Nếu <= 0 thì ghi '0'). Kèm rõ đơn vị.
- buy_quantity PHẢI >= 1 và là số nguyên dương
- Nếu không xác định được dung lượng → buy_quantity = 1, package_size = "", fridge_quantity = ""
- Đảm bảo buy_quantity <= stock (không mua nhiều hơn tồn kho)

QUY TẮC TỐI ƯU GIÁ:
- So sánh TỔNG CHI PHÍ = giá × buy_quantity (không chỉ giá đơn vị)
- Ưu tiên sản phẩm có tổng chi phí thấp hơn
- Nếu tổng chi phí gần nhau (chênh < 10%), ưu tiên sản phẩm có mô tả rõ ràng hơn
"""
    else:
        prompt = f"""You are a cost-optimization assistant for grocery shopping.

INGREDIENT TO BUY: "{ingredient}"{qty_context}

LIST OF PRODUCTS FROM MULTIPLE MARTS:
{product_list}

TASK: Select the BEST product considering relevance, price, and quantity.

PRODUCT SELECTION RULES:
1. The product MUST be truly relevant to the ingredient "{ingredient}"
2. If no suitable product is found → best_index = -1

QUANTITY RULES (buy_quantity):
- Recipe quantities are usually SMALL and FRACTIONAL (e.g. 150g, 200ml, 0.3kg)
- Stores sell in whole units (1 pack, 1 box, 1 kg...)
- Infer the weight/volume per unit from product name/description to populate package_size.
- It is CRITICAL to ALWAYS CONVERT package_size to the EXACT SAME UNIT as required_quantity if possible (e.g. Need 800g, product is 1kg -> package_size="1000g").
- Calculate: buy_quantity = ceil(needed_amount / per_unit_amount)
- Calculate: fridge_quantity = (package_size * buy_quantity) - needed_amount. Format with units. Output '0' if <= 0.
- buy_quantity MUST be >= 1 and a positive integer
- If unit size cannot be determined → buy_quantity = 1, package_size = "", fridge_quantity = ""
- Ensure buy_quantity <= stock

COST OPTIMIZATION RULES:
- Compare TOTAL COST = price × buy_quantity (not just unit price)
- Prefer products with lower total cost
- If total costs are close (difference < 10%), prefer the product with a clearer description
"""

    max_retries = 2
    for attempt in range(max_retries):
        try:
            llm = get_llm().with_structured_output(CostOptResult)
            result = await llm.ainvoke(prompt)

            if result.best_index < 0 or result.best_index >= len(candidates):
                logger.info(
                    "LLM cost-opt: no match for '%s' | reason=%s",
                    ingredient,
                    result.reason,
                )
                return None

            chosen = candidates[result.best_index]
            buy_qty = max(1, result.buy_quantity)
            if chosen.stock > 0:
                buy_qty = min(buy_qty, chosen.stock)

            chosen.buy_quantity = buy_qty
            chosen.required_quantity = required_quantity
            chosen.package_size = result.package_size
            chosen.fridge_quantity = result.fridge_quantity

            logger.info(
                "LLM cost-opt: '%s' (need=%s) → '%s' (%s₫ × %d, %s) | reason=%s",
                ingredient,
                required_quantity,
                chosen.product_name,
                chosen.price,
                buy_qty,
                chosen.source_mart,
                result.reason,
            )
            return chosen

        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(
                    "LLM cost-opt failed for '%s', retrying in 1s. Error: %s",
                    ingredient,
                    e,
                )
                await asyncio.sleep(1)
                continue

            logger.exception(
                "LLM cost-opt permanently failed for '%s'", ingredient
            )
            break

    # Smart Fallback logic if LLM completely fails
    with_price = [p for p in candidates if p.price is not None]
    best = (
        min(with_price, key=lambda p: p.price) if with_price else candidates[0]
    )
    best.required_quantity = required_quantity
    best.buy_quantity = 1

    # Attempt to extract package_size using regex
    m = re.search(
        r"(\d+(?:\.\d+)?)\s*(g|kg|ml|l|gam)(?!\w)",
        best.product_name,
        re.IGNORECASE,
    )
    if m:
        best.package_size = m.group(1) + m.group(2).lower()
        req_m = re.search(
            r"(\d+(?:\.\d+)?)\s*(g|kg|ml|l|gam)(?!\w)",
            required_quantity,
            re.IGNORECASE,
        )
        if req_m and req_m.group(2).lower() == m.group(2).lower():
            leftover = float(m.group(1)) * best.buy_quantity - float(
                req_m.group(1)
            )
            best.fridge_quantity = (
                f"{leftover:g}{m.group(2).lower()}" if leftover > 0 else "0"
            )

    return best
