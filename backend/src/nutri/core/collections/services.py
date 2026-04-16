# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy.future import select

from nutri.core.menus.models import RecipeCollection


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


async def ensure_default_collections(
    db: AsyncSession, user_id: uuid.UUID
) -> None:
    """Ensure default collections exist for a user."""
    defaults = ["Favorites", "Try later"]
    for name in defaults:
        q = select(RecipeCollection).where(
            RecipeCollection.user_id == user_id,
            RecipeCollection.name == name,
            RecipeCollection.is_default,
        )
        res = await db.execute(q)
        if not res.scalars().first():
            new_col = RecipeCollection(
                id=uuid.uuid4(), user_id=user_id, name=name, is_default=True
            )
            db.add(new_col)
    await db.commit()
