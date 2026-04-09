from pydantic import BaseModel


class MemoryDeleteResponse(BaseModel):
    status: str
    scope: str
    deleted_count: int
    user_id: str | None = None
