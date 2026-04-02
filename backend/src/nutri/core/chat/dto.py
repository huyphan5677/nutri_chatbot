from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ChatRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None


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
    meal_plan_draft: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


class UnreadSessionInfo(BaseModel):
    id: str
    title: str


class UnreadCountResponse(BaseModel):
    count: int
    sessions: List[UnreadSessionInfo]
