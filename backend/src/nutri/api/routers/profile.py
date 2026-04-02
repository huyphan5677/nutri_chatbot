from typing import List

from fastapi import APIRouter, Depends
from nutri.api.dependencies import get_current_user
from nutri.core.auth.models import User
from nutri.core.db.session import get_db
from nutri.core.profile.dto import CollectionDTO, PersonalRecipeDTO
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/collections", response_model=List[CollectionDTO])
async def get_user_collections(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get all collections for the current user."""
    return []


@router.get("/personal-recipes", response_model=List[PersonalRecipeDTO])
async def get_user_personal_recipes(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get all personal recipes for the current user."""
    return []
