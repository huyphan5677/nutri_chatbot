# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from nutri.common.config.settings import settings


if TYPE_CHECKING:
    from collections.abc import AsyncGenerator


engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=False)
async_session_maker = async_sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
