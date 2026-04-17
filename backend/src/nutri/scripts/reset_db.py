# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import asyncio
import logging

from sqlalchemy import text

from nutri.api.main import *  # noqa: F403
from nutri.core.db.session import Base, engine


logger = logging.getLogger("nutri.reset_db")


async def reset_database() -> None:
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
