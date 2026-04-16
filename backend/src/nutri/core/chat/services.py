# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import re


def is_meaningful_message(msg: str) -> bool:
    """Check if a message is meaningful."""
    if not msg:
        return False

    msg = msg.strip().lower()

    # too short
    if len(msg) < 3:
        return False

    # only repeating characters (kkkkk, hahaha, ...)
    if len(set(msg)) <= 2:
        return False

    # only random characters (lk, asd, qwe, egrerg)
    if re.fullmatch(r"[a-z]{1,4}", msg):
        return False

    # common meaningless words
    meaningless = {"hi", "hello", "kkk", "haha", "hihi", "lol"}
    if msg in meaningless:
        return False

    return True


def extract_meal_plan_draft(tool_calls) -> dict | None:
    if not isinstance(tool_calls, list):
        return None

    for item in tool_calls:
        if isinstance(item, dict) and item.get("type") == "meal_plan_draft":
            data = item.get("data")
            if isinstance(data, dict):
                return data
    return None
