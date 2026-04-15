# Nutri

An AI-powered nutrition platform that helps households plan meals, manage
grocery shopping, and make health-aware dietary decisions through natural
language conversation.

Nutri combines a multi-agent LLM orchestration system with real-time
streaming chat, structured meal plan generation, fridge-aware grocery
deduction, and direct supermarket API integration -- all behind a
conversational interface that adapts to each family member's health profile.

---

## Table of Contents

- [Demo Video](#demo-video)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [License](#license)

---

## Demo Video

<p align="center">
  <a href="https://youtu.be/ilNqJFyep2c" title="Watch the Nutri demo on YouTube">
    <img
      src="https://img.youtube.com/vi/ilNqJFyep2c/hqdefault.jpg"
      alt="Nutri product demo video"
      width="720"
    />
  </a>
</p>

<p align="center">
  <strong>Watch the product demo:</strong>
  <a href="https://youtu.be/ilNqJFyep2c">https://youtu.be/ilNqJFyep2c</a>
</p>

---

## Features

**Conversational AI Assistant**

- Natural language meal planning through a streaming chat interface (SSE).
- ReAct-based agent orchestration with autonomous tool selection.
- Multi-language support with automatic detection (Vietnamese, English).

**Intelligent Meal Planning**

- Generates personalised multi-day meal plans based on household profiles.
- Considers BMR/TDEE, dietary goals, allergies, conditions, and equipment.
- Draft-then-persist pattern: preview before committing to database.
- Per-person caloric breakdown with adjustment tips.

**Smart Grocery Management**

- Automatic shopping list generation from meal plans.
- Fridge-aware deduction: an AI agent compares your grocery list against
  current inventory, handling fuzzy name matching and unit conversions.
- Direct product search against Lotte Mart and WinMart APIs with
  cost-optimised strategy selection.

**Health-Aware Profiles**

- Household member management with individual health conditions, allergies,
  and dietary goals.
- Background AI enrichment of health profiles with dietary metadata
  (foods to avoid, foods to prioritise, clinical rules).
- Glucose spike prediction for specific foods.

**Recipe Discovery**

- Web search and structured extraction of recipes via Tavily + LLM pipeline.
- User-curated recipe collections with bookmarking.

---

## Architecture

```
                          +------------------+
                          |   React SPA      |
                          |   (Vite + TS)    |
                          +--------+---------+
                                   |
                              HTTP / SSE
                                   |
                          +--------+---------+
                          |   FastAPI         |
                          |   API Layer       |
                          +--------+---------+
                                   |
                    +--------------+--------------+
                    |                              |
          +---------+---------+         +---------+---------+
          |  Core Domain      |         |  AI Agent Layer    |
          |  Modules          |         |                    |
          |                   |         |  AssistantAgent    |
          |  auth, menus,     |         |  MealPlanAgent     |
          |  grocery, chat,   |         |  GroceryListAgent  |
          |  onboarding,      |         |  FridgeCheckAgent  |
          |  inventory        |         |  EnrichMetadata    |
          +--------+----------+         |  SpikePredictor    |
                   |                    +---------+----------+
                   |                              |
          +--------+---------+         +----------+---------+
          |  PostgreSQL 16   |         |  LLM Providers     |
          |  (pgvector)      |         |  (Gemini / OpenAI) |
          +------------------+         +--------------------+
```

The system follows a **multi-agent architecture** where a central orchestrator
(AssistantAgent) uses the ReAct reasoning pattern to route user intents to
six specialised agents and ten registered tools. Agents produce structured
outputs (Pydantic models) and communicate through LangGraph's stateful
checkpointer backed by PostgreSQL.

See [backend/docs/05-multi-agent-system.md](backend/docs/05-multi-agent-system.md)
for the full agent architecture reference.

---

## Technology Stack

### Backend

| Component        | Technology                              |
| ---------------- | --------------------------------------- |
| Language         | Python 3.12+                            |
| Web Framework    | FastAPI                                 |
| ORM              | SQLAlchemy 2.0 (async)                  |
| Database         | PostgreSQL 16 with pgvector             |
| AI Orchestration | LangGraph + LangChain                   |
| LLM Providers    | Google Gemini, OpenAI-compatible (Qwen) |
| Web Search       | Tavily API                              |
| Package Manager  | uv                                      |

### Frontend

| Component   | Technology             |
| ----------- | ---------------------- |
| Language    | TypeScript             |
| Framework   | React 18               |
| Build Tool  | Vite 5                 |
| Styling     | Tailwind CSS 3         |
| HTTP Client | Axios                  |
| Auth        | Google OAuth 2.0 + JWT |
| Routing     | React Router 6         |

### Infrastructure

| Component        | Technology                                    |
| ---------------- | --------------------------------------------- |
| Containerisation | Docker                                        |
| Orchestration    | Docker Compose                                |
| Web Server       | Nginx (frontend) + Gunicorn/Uvicorn (backend) |
| Database GUI     | pgweb                                         |

---

## Project Structure

```
nutri/
  backend/                   # FastAPI backend
    src/nutri/
      ai/                    # Multi-agent system (agents, tools, workflows)
      api/                   # HTTP routers, middleware, dependencies
      core/                  # Domain modules (models, DTOs, services)
      common/                # Configuration, logging
    database/                # Local PostgreSQL docker-compose
    docs/                    # Technical documentation (8 files)
    Dockerfile               # Production backend image

  frontend/                  # React SPA
    src/
      features/              # Feature modules (chat, menus, grocery, ...)
      components/            # Shared UI components
      api/                   # API client layer
      hooks/                 # Custom React hooks
      context/               # Auth and app context providers
    docs/                    # Frontend documentation
    Dockerfile               # Production frontend image (multi-stage)
    nginx.conf               # Nginx config (SPA routing + API proxy)

  deploy/                    # Production deployment
    docker-compose.yml       # Full stack: postgres, pgweb, backend, frontend
    .env                     # Environment variables
    README.md                # Deployment guide
```

---

## Getting Started

### Prerequisites

- Python >= 3.12 and [uv](https://docs.astral.sh/uv/)
- Node.js >= 20
- Docker (for PostgreSQL)

### 1. Clone the repository

```bash
git clone <repository-url>
cd nutri
```

### 2. Start the database

```bash
cd backend/database
docker compose up -d
```

### 3. Start the backend

```bash
cd backend
cp .env_example .env
# Edit .env with your API keys (GEMINI_API_KEY, TAVILY_API_KEY,...)

uv sync --all-packages
uv run uvicorn nutri.api.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000/docs`.

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## Deployment

The `deploy/` directory contains a production-ready Docker Compose
configuration that runs the full stack:

```bash
cd deploy
# Edit .env with production credentials
docker compose up -d
```

This starts four services: PostgreSQL, pgweb, backend (Gunicorn with
Uvicorn workers), and frontend (Nginx serving the Vite build with API
reverse proxy).

See [deploy/README.md](deploy/README.md) for the complete deployment guide
including image building, registry pushing, environment configuration, and
update procedures.

---

## Documentation

### Backend

Detailed technical documentation is available in
[backend/docs/](backend/docs/):

| Document                                                                              | Description                                  |
| ------------------------------------------------------------------------------------- | -------------------------------------------- |
| [00-overview.md](backend/docs/00-overview.md)                                         | System overview and design principles        |
| [01-project-structure.md](backend/docs/01-project-structure.md)                       | Directory layout and module responsibilities |
| [02-data-model.md](backend/docs/02-data-model.md)                                     | Database schema and ERD                      |
| [03-api-reference.md](backend/docs/03-api-reference.md)                               | Complete API endpoint catalogue              |
| [04-authentication-and-security.md](backend/docs/04-authentication-and-security.md)   | Auth flows, JWT, OAuth                       |
| [05-multi-agent-system.md](backend/docs/05-multi-agent-system.md)                     | Multi-agent architecture deep dive           |
| [06-workflows.md](backend/docs/06-workflows.md)                                       | End-to-end business workflow diagrams        |
| [07-configuration-and-deployment.md](backend/docs/07-configuration-and-deployment.md) | Environment, Docker, CI/CD                   |

### Frontend

Frontend documentation is available in
[frontend/docs/](frontend/docs/).

| Document                                                                   | Description                                 |
| -------------------------------------------------------------------------- | ------------------------------------------- |
| [00-overview.md](frontend/docs/00-overview.md)                             | Project context and high-level architecture |
| [01-project-structure.md](frontend/docs/01-project-structure.md)           | Directory layout and module organization    |
| [02-architecture.md](frontend/docs/02-architecture.md)                     | Design patterns and data flow               |
| [03-routing-and-navigation.md](frontend/docs/03-routing-and-navigation.md) | Router, guards, and navigation flows        |
| [04-authentication.md](frontend/docs/04-authentication.md)                 | Auth flow, token lifecycle, Google OAuth    |
| [05-api-layer.md](frontend/docs/05-api-layer.md)                           | API client and service module contracts     |
| [06-feature-modules.md](frontend/docs/06-feature-modules.md)               | Per-feature module deep dive                |
| [07-state-management.md](frontend/docs/07-state-management.md)             | State patterns and data flow                |
| [08-deployment.md](frontend/docs/08-deployment.md)                         | Build, Docker, Nginx, and env configuration |
| [09-design-system.md](frontend/docs/09-design-system.md)                   | Styling tokens, components, and typography  |

### Deployment

Deployment guide is available in
[deploy/README.md](deploy/README.md).

---

## License

This project is proprietary software. All rights reserved.
