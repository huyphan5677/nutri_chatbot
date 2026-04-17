# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import re
from typing import Any


def parse_number(val: Any) -> int:
    """Parse number from value."""
    if val is None:
        return 0
    if isinstance(val, (int, float)):
        return int(val)
    match = re.search(r"\d+", str(val))
    if match:
        return int(match.group())
    return 0
