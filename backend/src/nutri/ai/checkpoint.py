import logging
from typing import Any, Optional

from langchain_core.messages.utils import (
    count_tokens_approximately,
    trim_messages,
)
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from nutri.common.config.settings import settings
from psycopg_pool import AsyncConnectionPool

logger = logging.getLogger("nutri.ai.checkpoint")


def pre_model_trim_messages(
    state: dict[str, Any], max_tokens: int = 4096
) -> dict[str, Any]:
    messages = state.get("messages", [])
    if not messages:
        return {"llm_input_messages": []}

    trimmed_messages = trim_messages(
        messages,
        strategy="last",
        token_counter=count_tokens_approximately,
        max_tokens=max_tokens,
        start_on="human",
        end_on=("human", "tool"),
    )
    return {"llm_input_messages": trimmed_messages}


class CheckpointerManager:
    _instance: Optional["CheckpointerManager"] = None
    _pool: Optional[AsyncConnectionPool] = None
    _checkpointer: Optional[AsyncPostgresSaver] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CheckpointerManager, cls).__new__(cls)
        return cls._instance

    @property
    def conn_string(self) -> str:
        if settings.DATABASE_URL:
            url = settings.DATABASE_URL
            if url.startswith("postgresql+asyncpg://"):
                url = url.replace("postgresql+asyncpg://", "postgresql://")
            return url

        return f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"

    async def get_checkpointer(self) -> AsyncPostgresSaver:
        if self._checkpointer is None:
            await self.initialize()
        return self._checkpointer

    async def initialize(self):
        if self._pool is None:
            logger.info("Initializing Postgres checkpointer pool...")
            self._pool = AsyncConnectionPool(
                conninfo=self.conn_string,
                max_size=20,
                kwargs={"autocommit": True, "prepare_threshold": 0},
                open=False,
            )
            await self._pool.open()
            self._checkpointer = AsyncPostgresSaver(self._pool)
            await self._checkpointer.setup()
            logger.info("Postgres checkpointer initialized.")

    async def close(self):
        if self._pool:
            await self._pool.close()
            self._pool = None
            self._checkpointer = None
            logger.info("Postgres checkpointer pool closed.")


# Global singleton
checkpointer_manager = CheckpointerManager()


async def get_postgres_checkpointer() -> AsyncPostgresSaver:
    return await checkpointer_manager.get_checkpointer()


async def init_checkpointer():
    await checkpointer_manager.initialize()


async def close_checkpointer():
    await checkpointer_manager.close()
