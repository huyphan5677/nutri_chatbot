# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChatRequest(BaseModel):
    """Chat request model."""

    message: str
    thread_id: str | None = None


class ChatSessionUpdateRequest(BaseModel):
    """Chat session update request model."""

    title: str


class ChatResponse(BaseModel):
    """Chat response model."""

    reply: str
    thread_id: str


class ChatSessionResponse(BaseModel):
    """Chat session response model."""

    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    has_unread: bool

    model_config = ConfigDict(from_attributes=True)


class ChatMessageResponse(BaseModel):
    """Chat message response model."""

    id: str
    role: str
    content: str
    created_at: datetime
    meal_plan_draft: dict | None = None

    model_config = ConfigDict(from_attributes=True)


class UnreadSessionInfo(BaseModel):
    """Unread session info model."""

    id: str
    title: str


class UnreadCountResponse(BaseModel):
    """Unread count response model."""

    count: int
    sessions: list[UnreadSessionInfo]
