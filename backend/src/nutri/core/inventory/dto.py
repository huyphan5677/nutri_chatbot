# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class InventoryItemDTO(BaseModel):
    id: str
    name: str
    category: str | None
    quantity: str | None
    expiration_date: date | None


class InventoryListResponse(BaseModel):
    items: list[InventoryItemDTO]


class AddInventoryItemRequest(BaseModel):
    name: str
    category: str | None = None
    quantity: str | None = None
    expiration_date: str | None = None


class BulkAddInventoryRequest(BaseModel):
    items: list[AddInventoryItemRequest]


class UpdateInventoryItemRequest(BaseModel):
    name: str | None = None
    category: str | None = None
    quantity: str | None = None
    expiration_date: date | None = None


class RenameCategoryRequest(BaseModel):
    old_name: str
    new_name: str
