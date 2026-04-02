import uuid

from nutri.core.menus.models import RecipeCollection
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select


async def ensure_default_collections(db: AsyncSession, user_id: uuid.UUID):
    """Ensure default collections exist for a user."""
    defaults = ["Favorites", "Try later"]
    for name in defaults:
        q = select(RecipeCollection).where(
            RecipeCollection.user_id == user_id,
            RecipeCollection.name == name,
            RecipeCollection.is_default == True,
        )
        res = await db.execute(q)
        if not res.scalars().first():
            new_col = RecipeCollection(
                id=uuid.uuid4(), user_id=user_id, name=name, is_default=True
            )
            db.add(new_col)
    await db.commit()
