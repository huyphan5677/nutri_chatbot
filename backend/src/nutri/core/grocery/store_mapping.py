"""Store mapping utilities for Lotte Mart and WinMart."""

import json
import logging
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger("nutri.core.grocery.store_mapping")

_DATA_DIR = Path(__file__).parent / "data"


@lru_cache(maxsize=1)
def get_lotte_branches() -> list[dict]:
    """Return all Lotte Mart branches [{code, name}, ...]."""
    path = _DATA_DIR / "lotte_branches.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def _load_winmart_stores() -> list[dict]:
    """Load all WinMart stores from JSON."""
    path = _DATA_DIR / "winmart_stores.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def get_winmart_provinces() -> list[str]:
    """Return distinct province names sorted."""
    stores = _load_winmart_stores()
    provinces = sorted(
        {s.get("provinceTitle", "") for s in stores if s.get("provinceTitle")}
    )
    return provinces


def get_winmart_stores_by_province(province: str) -> list[dict]:
    """Return WinMart stores filtered by province title."""
    stores = _load_winmart_stores()
    return [
        {
            "storeCode": s["storeCode"],
            "storeName": s["storeName"],
            "storeGroupCode": s["storeGroupCode"],
            "officeAddress": s.get("officeAddress", ""),
            "districtTitle": s.get("districtTitle", ""),
            "wardTitle": s.get("wardTitle", ""),
        }
        for s in stores
        if s.get("provinceTitle", "").lower() == province.lower()
        and s.get("isOpen", False)
    ]
