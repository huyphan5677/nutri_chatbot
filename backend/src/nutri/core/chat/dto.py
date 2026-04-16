# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None


class ChatSessionUpdateRequest(BaseModel):
    title: str


class ChatResponse(BaseModel):
    reply: str
    thread_id: str


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    has_unread: bool

    model_config = ConfigDict(from_attributes=True)


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime
    meal_plan_draft: dict | None = None

    model_config = ConfigDict(from_attributes=True)


class UnreadSessionInfo(BaseModel):
    id: str
    title: str


class UnreadCountResponse(BaseModel):
    count: int
    sessions: list[UnreadSessionInfo]
