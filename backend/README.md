# Nutri Backend

AI-powered nutrition assistant backend built with FastAPI, LangGraph, and PostgreSQL.
Orchestrates multiple LLM-based agents to deliver personalised meal planning,
grocery shopping, and health-aware dietary guidance for households.

## Technology Stack

| Layer            | Technology                       |
| ---------------- | -------------------------------- |
| Language         | Python >= 3.12                   |
| Web Framework    | FastAPI + Uvicorn / Gunicorn     |
| ORM              | SQLAlchemy 2.0 (async)           |
| Database         | PostgreSQL 16 (pgvector)         |
| AI Orchestration | LangGraph + LangChain            |
| LLM Providers    | Google Gemini, OpenAI-compatible |
| Web Search       | Tavily API                       |
| Package Manager  | uv (Astral)                      |
| Containerisation | Docker                           |

## Architecture

```
Client (React)
    |
    v  HTTP / SSE
+--------------------------+
|   FastAPI API Layer      |   Routers, middleware, dependencies
+--------------------------+
|   Core Domain Modules    |   Auth, menus, grocery, onboarding, chat, inventory
+--------------------------+
|   AI Agent Layer         |   AssistantAgent, MealPlanAgent, GroceryListAgent,
|                          |   FridgeCheckAgent, EnrichMetadataAgent, SpikePredictorAgent
+--------------------------+
    |           |           |
    v           v           v
 PostgreSQL   LLM API    Tavily / Mart APIs
```

The system follows a **multi-agent architecture** where a central orchestrator
(AssistantAgent) uses the ReAct pattern to route user requests to specialised
agents and tools. Meal plans are generated as ephemeral drafts streamed to the
client, then persisted only upon user confirmation.

See [docs/05-multi-agent-system.md](docs/05-multi-agent-system.md) for the
full agent architecture reference.

## Quick Start

### Prerequisites

- Python >= 3.12
- [uv](https://docs.astral.sh/uv/) package manager
- Docker (for PostgreSQL)

### 1. Start the database

```bash
cd database
docker compose up -d
```

This starts PostgreSQL 16 (port 5432) and pgweb database browser (port 8081).

### 2. Install dependencies

```bash
uv sync --all-packages
```

### 3. Configure environment

```bash
cp .env_example .env
```

Edit `.env` and set the required variables:

| Variable              | Description                             |
| --------------------- | --------------------------------------- |
| `GEMINI_API_KEY`      | API key for the configured LLM provider |
| `GEMINI_API_ENDPOINT` | Base URL for the LLM API endpoint       |
| `TAVILY_API_KEY`      | API key for Tavily web search           |

See [docs/07-configuration-and-deployment.md](docs/07-configuration-and-deployment.md)
for the full variable reference.

### 4. Run the application

```bash
uv run uvicorn nutri.api.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000/docs`.
The Docs API will be available at `http://localhost:8000/redoc`.
OpenAPI spec at `http://localhost:8000/api/v1/openapi.json`.

## Project Structure

```
backend/
  pyproject.toml              # Dependencies and workspace config
  Dockerfile                  # Production container image
  docker-entrypoint.sh        # Container startup script
  database/
    docker-compose.yaml       # Local PostgreSQL + pgweb
  libs/
    logger/                   # Internal logging package (nutri-logger)
  src/nutri/
    api/                      # FastAPI app, routers, dependencies
      main.py                 # Application entry point
      routers/                # Endpoint modules (auth, chat, menus, grocery, ...)
    ai/                       # AI layer
      agents/                 # Agent implementations (6 agents)
      tools/                  # LangChain tools (callable by agents)
      workflows/              # Multi-step orchestration pipelines
      llm_client.py           # LLM provider factory
      checkpoint.py           # LangGraph state persistence
    core/                     # Domain modules
      auth/                   # User model, DTOs
      chat/                   # Chat session and message models
      menus/                  # MealPlan, Recipe, Ingredient models
      grocery/                # Grocery, inventory, shopping models
      onboarding/             # Family member model, BMR/TDEE services
      db/                     # Database engine and session factory
      security/               # JWT and password utilities
    common/
      config/                 # Settings (env), logging configuration
  tests/                      # Test suite
  logs/                       # Runtime logs (git-ignored)
```

See [docs/01-project-structure.md](docs/01-project-structure.md) for detailed
module descriptions.

## API Overview

All endpoints are prefixed with `/api/v1`. Authentication is via Bearer JWT.

| Group       | Prefix         | Key Endpoints                                  |
| ----------- | -------------- | ---------------------------------------------- |
| Auth        | `/auth`        | Register, login, Google OAuth, current user    |
| Chat        | `/chat`        | SSE streaming chat, session CRUD, unread count |
| Menus       | `/menus`       | Meal plan CRUD, save draft from chat           |
| Grocery     | `/grocery`     | Grocery list, shopping orders, store search    |
| Inventory   | `/inventory`   | Fridge/pantry CRUD, bulk import                |
| Onboarding  | `/onboarding`  | Profile setup, family members, health data     |
| Recipes     | `/recipes`     | Web search and extraction                      |
| Collections | `/collections` | Recipe bookmarks                               |
| Profile     | `/profile`     | User profile summary                           |
| System      | `/system`      | Health check, dashboard status, log viewer     |

See [docs/03-api-reference.md](docs/03-api-reference.md) for the complete
endpoint catalogue with request/response schemas.

## Multi-Agent System

The backend orchestrates six specialised AI agents:

| Agent                         | Role                                               |
| ----------------------------- | -------------------------------------------------- |
| **AssistantAgent**            | Main conversational orchestrator (ReAct, stateful) |
| **MealPlanAgent**             | Generates structured daily meal plans              |
| **GroceryListGeneratorAgent** | Aggregates ingredients into shopping lists         |
| **FridgeCheckAgent**          | Deducts fridge inventory from shopping lists       |
| **EnrichMetadataAgent**       | Enriches health profiles with dietary metadata     |
| **SpikePredictorAgent**       | Predicts glucose spike risk for foods              |

See [docs/05-multi-agent-system.md](docs/05-multi-agent-system.md) for the
full architecture deep dive, tool catalogue, and prompt engineering details.

## Database

PostgreSQL 16 with pgvector. Tables are auto-created at startup via
`Base.metadata.create_all`. Key entities:

- `users` -- accounts and preferences
- `family_members` -- household profiles with health data (JSONB)
- `chat_sessions` / `chat_messages` -- conversation history
- `meal_plans` / `meals` / `recipes` -- meal planning domain
- `ingredients` / `recipe_ingredients` -- normalised ingredient catalogue
- `grocery_items` / `shopping_orders` -- shopping domain
- `user_inventories` -- fridge/pantry tracking

See [docs/02-data-model.md](docs/02-data-model.md) for the ERD and full
schema reference.

## Docker

### Build

```bash
docker build -t nutri-backend:latest .
```

### Run

The container requires environment variables for database and LLM
configuration. The entrypoint script handles DB initialisation before starting
the server.

```bash
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/nutri \
  -e GEMINI_API_KEY=your-key \
  -e GEMINI_API_ENDPOINT=http://your-endpoint \
  -e TAVILY_API_KEY=your-key \
  -e SECRET_KEY=your-secret \
  nutri-backend:latest
```

## Development

```bash
# Lint
uv run ruff check .

# Type check
uv run mypy src/

# Test
uv run pytest

# Database browser
open http://localhost:8081
```

## Logging

Two rotating log files are generated at runtime:

| File                | Content                       |
| ------------------- | ----------------------------- |
| `logs/nutri.log`    | All application logs (DEBUG+) |
| `logs/ai_agent.log` | AI agent and tool logs only   |

## Documentation

Detailed technical documentation is available in the [docs/](docs/) directory:

| Document                                                                      | Content                                      |
| ----------------------------------------------------------------------------- | -------------------------------------------- |
| [00-overview.md](docs/00-overview.md)                                         | System overview and design principles        |
| [01-project-structure.md](docs/01-project-structure.md)                       | Directory layout and module responsibilities |
| [02-data-model.md](docs/02-data-model.md)                                     | Database schema and ERD                      |
| [03-api-reference.md](docs/03-api-reference.md)                               | Complete API endpoint catalogue              |
| [04-authentication-and-security.md](docs/04-authentication-and-security.md)   | Auth flows, JWT, OAuth                       |
| [05-multi-agent-system.md](docs/05-multi-agent-system.md)                     | Multi-agent architecture deep dive           |
| [06-workflows.md](docs/06-workflows.md)                                       | End-to-end business workflow diagrams        |
| [07-configuration-and-deployment.md](docs/07-configuration-and-deployment.md) | Environment, Docker, CI/CD                   |
