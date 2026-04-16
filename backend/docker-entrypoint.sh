#!/bin/bash
set -e

echo "Running database initialization script..."

sleep 5

# Create tables
uv run python -c "
import asyncio
from nutri.core.db.session import engine, Base
from nutri.api.main import *

async def init_db():
    print('Creating tables if they do not exist...')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Database initialization complete.')

asyncio.run(init_db())
"
