import re


def accumulate_quantities(old_qty: str, new_qty: str) -> str:
    """Intelligently add two quantity strings together if units match."""
    if not old_qty:
        return new_qty
    if not new_qty:
        return old_qty

    old_qty = str(old_qty).strip()
    new_qty = str(new_qty).strip()

    # Matches a number (integer/float) followed by an optional unit of letters
    unit_pattern = r"^(\d+(?:\.\d+)?)\s*([a-zA-Záàãạảăắằẵặẳâấầẫậpẩéèẽẹẻêếềễệểíìĩịỉóòõọỏôốồỗộổơớờỡợởúùũụủưứừữựửýỳỹỵỷđ]+)?$"
    old_match = re.match(unit_pattern, old_qty)
    new_match = re.match(unit_pattern, new_qty)

    if old_match and new_match:
        old_val = float(old_match.group(1))
        old_unit = (old_match.group(2) or "").lower()

        new_val = float(new_match.group(1))
        new_unit = (new_match.group(2) or "").lower()

        # Normalize basic units
        if old_unit in ["g", "gam", "gram"]:
            old_unit = "g"
        if new_unit in ["g", "gam", "gram"]:
            new_unit = "g"
        if old_unit in ["kg", "kilogam", "kgam"]:
            old_unit = "kg"
        if new_unit in ["kg", "kilogam", "kgam"]:
            new_unit = "kg"
        if old_unit in ["ml", "mililit"]:
            old_unit = "ml"
        if new_unit in ["ml", "mililit"]:
            new_unit = "ml"
        if old_unit in ["l", "lit"]:
            old_unit = "l"
        if new_unit in ["l", "lit"]:
            new_unit = "l"

        # Direct match
        if old_unit == new_unit:
            total = old_val + new_val
            unit_display = new_match.group(2) or ""
            return f"{total:g}{unit_display}"

        # Conversions
        if old_unit == "g" and new_unit == "kg":
            total = old_val + (new_val * 1000)
            return f"{total:g}g"
        elif old_unit == "kg" and new_unit == "g":
            total = (old_val * 1000) + new_val
            return f"{total:g}g"

        if old_unit == "ml" and new_unit == "l":
            total = old_val + (new_val * 1000)
            return f"{total:g}ml"
        elif old_unit == "l" and new_unit == "ml":
            total = (old_val * 1000) + new_val
            return f"{total:g}ml"

    # Fallback to appending
    return f"{old_qty} + {new_qty}"
