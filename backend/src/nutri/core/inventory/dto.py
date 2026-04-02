from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class InventoryItemDTO(BaseModel):
    id: str
    name: str
    category: Optional[str]
    quantity: Optional[str]
    expiration_date: Optional[date]


class InventoryListResponse(BaseModel):
    items: List[InventoryItemDTO]


class AddInventoryItemRequest(BaseModel):
    name: str
    category: Optional[str] = None
    quantity: Optional[str] = None
    expiration_date: Optional[str] = None


class BulkAddInventoryRequest(BaseModel):
    items: List[AddInventoryItemRequest]


class UpdateInventoryItemRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[str] = None
    expiration_date: Optional[date] = None


class RenameCategoryRequest(BaseModel):
    old_name: str
    new_name: str
