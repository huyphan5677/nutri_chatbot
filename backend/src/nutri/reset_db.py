import asyncio
import logging

from nutri.api.main import *  # This ensures all models are loaded
from nutri.core.db.session import Base, engine
from sqlalchemy import text

logger = logging.getLogger("nutri.reset_db")


async def reset_database():
    logger.info("Dropping existing tables...")
    async with engine.begin() as conn:
        # Drop schema Cascade to wipe old tables, then recreate
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))

        logger.info("Recreating new tables...")
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database reset complete.")


if __name__ == "__main__":
    asyncio.run(reset_database())
