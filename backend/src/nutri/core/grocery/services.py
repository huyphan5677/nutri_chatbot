# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations


def format_quantity_grams(quantity: float) -> str:
    """Format quantity in grams."""
    if quantity is None:
        return "1g"
    try:
        value = float(quantity)
        text = str(int(value)) if value.is_integer() else f"{value:g}"
        return f"{text}g"
    except Exception:
        return f"{quantity}g"
