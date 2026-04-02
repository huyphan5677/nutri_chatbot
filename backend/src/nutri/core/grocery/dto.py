from typing import List, Optional

from pydantic import BaseModel


class GroceryItemDTO(BaseModel):
    id: str
    name: str
    category: Optional[str]
    quantity: Optional[str]
    is_purchased: bool


class UpdateGroceryItemRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[str] = None
    is_purchased: Optional[bool] = None


class GroceryListResponse(BaseModel):
    items: List[GroceryItemDTO]


class GroceryMenuGroupDTO(BaseModel):
    meal_plan_id: Optional[str] = None
    meal_plan_name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    items: List[GroceryItemDTO]


class GroceryByMenuResponse(BaseModel):
    menus: List[GroceryMenuGroupDTO]


class ShoppingRequest(BaseModel):
    meal_plan_id: str
    strategy: str  # "lotte_priority" | "winmart_priority" | "cost_optimized"
    lotte_branch_id: str = "nsg"
    winmart_store_code: str = "1535"
    winmart_store_group_code: str = "1998"


class FridgeCoveredDTO(BaseModel):
    name: str
    fridge_quantity: Optional[str] = ""
    required_quantity: Optional[str] = ""


class ShoppingProductDTO(BaseModel):
    ingredient_name: str
    quantity: Optional[str] = None
    required_quantity: Optional[str] = None
    package_size: Optional[str] = ""
    fridge_quantity: Optional[str] = ""
    fridge_deducted: Optional[str] = ""
    original_quantity: Optional[str] = ""
    buy_quantity: Optional[int] = 1
    product_name: str
    price: Optional[float] = None
    stock: float = 0
    product_url: str
    source_mart: str  # "Lotte" | "Winmart"
    description: str = ""


class ShoppingResultDTO(BaseModel):
    items: List[ShoppingProductDTO]
    not_found: List[str]
    fridge_covered: List[FridgeCoveredDTO] = []
    total_estimated_cost: float
    strategy: str
    summary: str


class ShoppingOrderResponse(BaseModel):
    order_id: str
    status: str  # "processing", "completed", "failed"
    result_data: Optional[ShoppingResultDTO] = None


class ShoppingOrderStartResponse(BaseModel):
    order_id: str
    status: str
    message: str
