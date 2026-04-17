# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from pydantic import BaseModel


class GoogleToken(BaseModel):
    """Google OAuth token payload."""

    token: str
