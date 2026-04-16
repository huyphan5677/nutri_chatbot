# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from pydantic import BaseModel


class GroceryItemDTO(BaseModel):
    id: str
    name: str
    category: str | None
    quantity: str | None
    is_purchased: bool


class UpdateGroceryItemRequest(BaseModel):
    name: str | None = None
    category: str | None = None
    quantity: str | None = None
    is_purchased: bool | None = None


class GroceryListResponse(BaseModel):
    items: list[GroceryItemDTO]


class GroceryMenuGroupDTO(BaseModel):
    meal_plan_id: str | None = None
    meal_plan_name: str
    start_date: str | None = None
    end_date: str | None = None
    status: str | None = None
    items: list[GroceryItemDTO]


class GroceryByMenuResponse(BaseModel):
    menus: list[GroceryMenuGroupDTO]


class ShoppingRequest(BaseModel):
    meal_plan_id: str
    strategy: str  # "lotte_priority" | "winmart_priority" | "cost_optimized"
    lotte_branch_id: str = "nsg"
    winmart_store_code: str = "1535"
    winmart_store_group_code: str = "1998"


class FridgeCoveredDTO(BaseModel):
    name: str
    fridge_quantity: str | None = ""
    required_quantity: str | None = ""


class ShoppingProductDTO(BaseModel):
    ingredient_name: str
    quantity: str | None = None
    required_quantity: str | None = None
    package_size: str | None = ""
    fridge_quantity: str | None = ""
    fridge_deducted: str | None = ""
    original_quantity: str | None = ""
    buy_quantity: int | None = 1
    product_name: str
    price: float | None = None
    stock: float = 0
    product_url: str
    source_mart: str  # "Lotte" | "Winmart"
    description: str = ""


class ShoppingResultDTO(BaseModel):
    items: list[ShoppingProductDTO]
    not_found: list[str]
    fridge_covered: list[FridgeCoveredDTO] = []
    total_estimated_cost: float
    strategy: str
    summary: str


class ShoppingOrderResponse(BaseModel):
    order_id: str
    status: str  # "processing", "completed", "failed"
    result_data: ShoppingResultDTO | None = None


class ShoppingOrderStartResponse(BaseModel):
    order_id: str
    status: str
    message: str


class ShoppingHistoryItemDTO(BaseModel):
    id: str
    date: str
    items_count: int
    cost: float | None = None
    currency: str | None = "VND"
    status: str


class ShoppingHistoryResponse(BaseModel):
    total_trips: int
    total_spent: float
    avg_items: int
    avg_cost: float
    history: list[ShoppingHistoryItemDTO]
