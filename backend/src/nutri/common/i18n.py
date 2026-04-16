# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from fastapi import Request


SUPPORTED_LANGUAGES = {"en", "vi"}


def normalize_language(language: str | None, default: str = "en") -> str:
    if not language:
        return default

    candidate = str(language).strip().replace("_", "-").lower()
    if not candidate:
        return default

    primary = candidate.split(",")[0].split(";")[0].split("-")[0].strip()
    return primary if primary in SUPPORTED_LANGUAGES else default


def get_request_language(request: Request, default: str = "en") -> str:
    return normalize_language(
        request.headers.get("Accept-Language"), default=default
    )
