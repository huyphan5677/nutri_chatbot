# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class InventoryItemDTO(BaseModel):
    """Inventory item data transfer object."""

    id: str
    name: str
    category: str | None
    quantity: str | None
    expiration_date: date | None


class InventoryListResponse(BaseModel):
    """Inventory list response model."""

    items: list[InventoryItemDTO]


class AddInventoryItemRequest(BaseModel):
    """Add inventory item request model."""

    name: str
    category: str | None = None
    quantity: str | None = None
    expiration_date: str | None = None


class BulkAddInventoryRequest(BaseModel):
    """Bulk add inventory request model."""

    items: list[AddInventoryItemRequest]


class UpdateInventoryItemRequest(BaseModel):
    """Update inventory item request model."""

    name: str | None = None
    category: str | None = None
    quantity: str | None = None
    expiration_date: date | None = None


class RenameCategoryRequest(BaseModel):
    """Rename category request model."""

    old_name: str
    new_name: str
