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

# echo "Starting Uvicorn..."
# exec uv run uvicorn nutri.api.main:app --host 0.0.0.0 --port ${BACKEND_PORT:-8000}

# echo "Starting Gunicorn..."
# exec uv run gunicorn nutri.api.main:app -w 4 -k uvicorn.workers.UvicornWorker -b [IP_ADDRESS]:${BACKEND_PORT:-8000}
