from typing import Annotated

from fastapi import APIRouter, Depends
from nutri.ai.memory import delete_all_memories, delete_memories_by_user
from nutri.api.dependencies import get_current_user
from nutri.core.auth.models import User
from nutri.core.memory.dto import MemoryDeleteResponse

router = APIRouter()


CurrentUserDep = Annotated[User, Depends(get_current_user)]


@router.delete("/me", response_model=MemoryDeleteResponse)
async def delete_my_memories(current_user: CurrentUserDep) -> MemoryDeleteResponse:
    """Delete all memory rows for the current user."""
    deleted_count = await delete_memories_by_user(str(current_user.id))
    return MemoryDeleteResponse(
        status="deleted",
        scope="user",
        deleted_count=deleted_count,
        user_id=str(current_user.id),
    )


@router.delete("/all", response_model=MemoryDeleteResponse)
async def delete_every_memory(current_user: CurrentUserDep) -> MemoryDeleteResponse:
    """Delete all rows from the memories table."""
    deleted_count = await delete_all_memories()
    return MemoryDeleteResponse(
        status="deleted",
        scope="all",
        deleted_count=deleted_count,
        user_id=None,
    )
