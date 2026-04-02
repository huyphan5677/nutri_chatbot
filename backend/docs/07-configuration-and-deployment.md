# Configuration and Deployment

## 1. Environment Variables

Configuration is managed through Pydantic Settings (`common/config/settings.py`)
which reads from a `.env` file or system environment variables.

### Required Variables

| Variable              | Type   | Description                             |
| --------------------- | ------ | --------------------------------------- |
| `GEMINI_API_KEY`      | string | API key for the configured LLM provider |
| `GEMINI_API_ENDPOINT` | string | Base URL for the LLM API endpoint       |
| `TAVILY_API_KEY`      | string | API key for Tavily web search           |

### Optional Variables

| Variable                      | Type   | Default          | Description                                                 |
| ----------------------------- | ------ | ---------------- | ----------------------------------------------------------- |
| `POSTGRES_SERVER`             | string | `localhost`      | Database host                                               |
| `POSTGRES_USER`               | string | `postgres`       | Database user                                               |
| `POSTGRES_PASSWORD`           | string | `password`       | Database password                                           |
| `POSTGRES_DB`                 | string | `nutri`          | Database name                                               |
| `POSTGRES_PORT`               | int    | `5432`           | Database port                                               |
| `DATABASE_URL`                | string | null             | Full database URL (overrides individual Postgres settings)  |
| `LLM_PROVIDER`                | string | `openai`         | `"gemini"` or `"openai"`                                    |
| `MODEL_NAME`                  | string | null             | LLM model name (defaults: gemini-2.5-flash / qwen3-vl-plus) |
| `TEMPERATURE`                 | float  | `0.5`            | Default LLM sampling temperature                            |
| `ENVIRONMENT`                 | string | `local`          | `"local"` or `"production"`                                 |
| `SECRET_KEY`                  | string | `supersecretkey` | JWT signing key (change in production)                      |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | int    | `1440`           | JWT token expiry (24 hours)                                 |
| `API_V1_STR`                  | string | `/api/v1`        | API version prefix                                          |
| `PROJECT_NAME`                | string | `Nutri API`      | Application name                                            |

### Example `.env` File

```env
POSTGRES_SERVER=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=nutri
POSTGRES_PORT=5432

GEMINI_API_KEY=your-api-key
GEMINI_API_ENDPOINT=http://your-endpoint

TEMPERATURE=0.5
LLM_PROVIDER=openai
MODEL_NAME=qwen3-vl-plus

TAVILY_API_KEY=tvly-dev-xxxxx

ENVIRONMENT=production
SECRET_KEY=generate_a_secure_random_string_here_for_prod
```

## 2. Database Setup

### Local Development

A `docker-compose.yaml` in `database/` provides PostgreSQL 16 with pgvector
and a pgweb GUI:

```bash
cd database
docker compose up -d
```

| Service          | Port | Description                           |
| ---------------- | ---- | ------------------------------------- |
| `nutri_postgres` | 5432 | PostgreSQL 16 with pgvector extension |
| `nutri_pgweb`    | 8081 | Web-based database browser            |

### Schema Initialization

Tables are created automatically at application startup via:

```python
async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)
```

This runs in the FastAPI lifespan handler. The LangGraph checkpointer tables
are also created during startup via `checkpointer.setup()`.

### Database Reset

A utility script is available for development:

```bash
uv run python -m nutri.reset_db
```

## 3. Running Locally

### Prerequisites

- Python >= 3.12
- uv package manager
- PostgreSQL 16 (via Docker or native)

### Setup

```bash
# Install dependencies
uv sync

# Start database
cd database && docker compose up -d && cd ..

# Copy environment file
cp .env_example .env
# Edit .env with your API keys

# Run the application
uv run uvicorn nutri.api.main:app --host 0.0.0.0 --port 8000 --reload
```

The application will be available at `http://localhost:8000`.
API documentation: `http://localhost:8000/api/v1/openapi.json`.

## 4. Docker Deployment

### Dockerfile

The production image uses a multi-stage approach:

```
Base image:  python:3.12-slim
Package mgr: uv (copied from ghcr.io/astral-sh/uv:latest)
Dependencies: uv sync --frozen --no-dev
Entrypoint:  docker-entrypoint.sh
```

### Build and Push

```bash
# Build
docker build -t nutri-backend:latest .

# Tag and push
docker tag nutri-backend:latest <your-docker-hub>/nutri-backend:DDMMYYYY_HHMM
docker push <your-docker-hub>/nutri-backend:DDMMYYYY_HHMM
```

### Docker Entrypoint

The entrypoint script (`docker-entrypoint.sh`):

1. Waits 5 seconds for database readiness.
2. Runs database table creation via Python.
3. Starts the application server (Uvicorn or Gunicorn).

```bash
#!/bin/bash
set -e
sleep 5

# Create tables
uv run python -c "
import asyncio
from nutri.core.db.session import engine, Base
from nutri.api.main import *

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
asyncio.run(init_db())
"

# Start server (uncomment preferred option)
# exec uv run uvicorn nutri.api.main:app --host 0.0.0.0 --port ${BACKEND_PORT:-8000}
# exec uv run gunicorn nutri.api.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:${BACKEND_PORT:-8000}
```

### Production Server Options

| Server             | Command                                          | Use Case                   |
| ------------------ | ------------------------------------------------ | -------------------------- |
| Uvicorn            | `uvicorn nutri.api.main:app`                     | Development, single-worker |
| Gunicorn + Uvicorn | `gunicorn -w 4 -k uvicorn.workers.UvicornWorker` | Production, multi-worker   |

## 5. Logging

### Configuration

Logging is set up at application startup by `common/config/logging_config.py`:

| Log File            | Content                       | Max Size | Backups |
| ------------------- | ----------------------------- | -------- | ------- |
| `logs/nutri.log`    | All application logs (DEBUG+) | 10 MB    | 5       |
| `logs/ai_agent.log` | AI agent and tool logs only   | 10 MB    | 5       |

### Log Format

```
2026-04-02 15:30:45 | INFO     | nutri.api:112 | <- GET /api/v1/menus/current | status=200 | 45.3ms | ip=192.168.1.1
```

### Logger Hierarchy

```
nutri                        -> nutri.log (console + file)
  nutri.api                  -> nutri.log
  nutri.core                 -> ai_agent.log
  nutri.ai                   -> ai_agent.log (console + file)
    nutri.ai.agents          -> ai_agent.log
    nutri.ai.workflows       -> ai_agent.log
  nutri.core.grocery.*       -> ai_agent.log (search/validation)
```

### Silenced Loggers

Third-party loggers set to WARNING to reduce noise:

- `httpx`, `httpcore`, `langchain`, `langgraph`, `openai`, `google`,
  `uvicorn.access`

## 6. Middleware

### Request Logging Middleware

Every HTTP request is logged with:

- Method, path, client IP (from `X-Forwarded-For` or direct)
- Response status code and elapsed time

### CORS Middleware

Currently configured with `allow_origins=["*"]`. Must be restricted to the
frontend domain in production.

## 7. Development Tools

| Tool   | Purpose                | Command                 |
| ------ | ---------------------- | ----------------------- |
| uv     | Package management     | `uv sync`, `uv run`     |
| ruff   | Linting and formatting | `uv run ruff check .`   |
| mypy   | Type checking          | `uv run mypy src/`      |
| pytest | Testing                | `uv run pytest`         |
| pgweb  | Database browser       | `http://localhost:8081` |

## 8. Dependency Management

Dependencies are declared in the root `pyproject.toml` and locked with
`uv.lock`. The workspace structure enables sharing internal packages:

```toml
[tool.uv.workspace]
members = ["libs/*", "src/*", "packages/*"]

[tool.uv.sources]
nutri-logger = { workspace = true }
```

To add a dependency:

```bash
uv add <package>           # Runtime dependency
uv add --dev <package>     # Development dependency
```

## 9. Windows Development Note

The application includes a Windows-specific event loop policy at the top of
`api/main.py`:

```python
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
```

This is required for `asyncpg` and other async I/O on Windows.
