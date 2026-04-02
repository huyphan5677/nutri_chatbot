# Nutri Frontend -- Project Overview

| Attribute        | Value                                       |
| ---------------- | ------------------------------------------- |
| Application Name | Nutri                                        |
| Type             | Single Page Application (SPA)               |
| Framework        | React 18 + TypeScript                       |
| Build Tool       | Vite 5                                       |
| Styling          | Tailwind CSS 3.4                            |
| Runtime Target   | Modern browsers (ES2020)                    |
| Package Manager  | npm                                          |
| Deployment       | Docker (multi-stage) + Nginx               |

---

## 1. What is Nutri?

Nutri is an AI-powered meal planning and smart grocery shopping platform. The frontend is the user-facing SPA that enables users to:

- Authenticate via email/password or Google OAuth 2.0.
- Complete a guided onboarding quiz to capture dietary preferences, household members, and kitchen equipment.
- Interact with an AI chat assistant (streaming SSE) to generate personalized meal plans.
- View, manage, and archive weekly meal plans and their associated grocery lists.
- Search for and browse recipes, save them to personal collections.
- Manage a fridge inventory with category-based organization.
- Shop for groceries through integrated Vietnamese e-commerce stores (Lotte Mart, WinMart) with cost-optimized strategies.
- View real-time system and AI agent logs for debugging.
- Manage account settings across multiple profile sub-pages.

---

## 2. High-Level Architecture Diagram

```
+-----------------------------------------------------+
|                     Browser (SPA)                    |
| +-------------------+  +---------------------------+ |
| |   Public Pages    |  |    Authenticated App      | |
| |   (HomePage)      |  | +--------+ +-----------+ | |
| +-------------------+  | | Navbar | | Footer    | | |
|                         | +--------+ +-----------+ | |
|                         | +----------+              | |
|                         | | MainLayout (Outlet)   | | |
|                         | |  - Dashboard           | | |
|                         | |  - Chat (SSE Stream)   | | |
|                         | |  - Meal Planner        | | |
|                         | |  - Grocery List        | | |
|                         | |  - Inventory           | | |
|                         | |  - Cooking / Recipes   | | |
|                         | |  - Profile Settings    | | |
|                         | |  - System Logs         | | |
|                         | +----------+              | |
|                         +---------------------------+ |
+-----------------------------------------------------+
            |                           |
            | HTTP (REST + SSE)         | Google OAuth
            v                           v
+---------------------+     +---------------------+
|   Backend API        |     |  Google Identity    |
|   (FastAPI :8000)    |     |  Platform           |
+---------------------+     +---------------------+
```

---

## 3. Key Technology Decisions

### React 18 with TypeScript
The application uses React 18 in strict mode. TypeScript provides type safety across component props, API response types, and internal data structures. The `strict` compiler flag is enabled, though `noUnusedLocals` and `noUnusedParameters` are relaxed for development velocity.

### Vite 5 as Build Tool
Vite provides fast HMR during development and optimized builds for production. The `@` path alias resolves to `./src` for clean imports. The dev server proxies `/api` requests to the backend service.

### Tailwind CSS 3.4
Styling is handled entirely through Tailwind utility classes with a custom design token layer defined in `tailwind.config.js`. No CSS-in-JS or component library (e.g., Material UI) is used.

### No Global State Management Library
The application intentionally avoids Redux, Zustand, or similar state management libraries. State is managed through:
- React `useState` / `useEffect` at the component level.
- URL state via React Router's `location.state` for cross-page communication.
- `localStorage` for authentication token persistence.
- Browser `CustomEvent` for inter-component communication (e.g., notification updates).

### Server-Sent Events (SSE) for Chat
The chat feature uses a streaming SSE connection rather than WebSockets. This was chosen for compatibility with the backend's FastAPI `StreamingResponse` and simplifies the connection model (unidirectional server-to-client streaming over a single HTTP POST).

---

## 4. Backend Contract

The frontend communicates with a FastAPI backend at `/api/v1`. All authenticated requests include a `Bearer` token in the `Authorization` header. The token is stored in `localStorage` under the key `nutri_token`.

The backend provides the following API groups consumed by the frontend:

| API Group     | Base Path              | Purpose                                    |
| ------------- | ---------------------- | ------------------------------------------ |
| Auth          | `/api/v1/auth`         | Login, registration, Google OAuth, profile  |
| Chat          | `/api/v1/chat`         | Conversations, streaming, sessions          |
| Menus         | `/api/v1/menus`        | Meal plan CRUD, save from chat              |
| Grocery       | `/api/v1/grocery`      | Shopping lists, store APIs, shopping orders  |
| Inventory     | `/api/v1/inventory`    | Fridge item CRUD, bulk add, categories      |
| Recipes       | `/api/v1/recipes`      | Recipe search, web search, CRUD             |
| Collections   | `/api/v1/collections`  | Recipe collections CRUD                     |
| Onboarding    | `/api/v1/onboarding`   | User preferences and household setup        |
| System        | `/api/v1/system`       | Logs viewer, dashboard status               |

---

## 5. Source of Truth

This document set serves as the canonical technical reference for the Nutri frontend architecture. It was authored for knowledge transfer purposes and should be updated whenever structural changes are made to the application.

| Document                      | Description                                       |
| ----------------------------- | ------------------------------------------------- |
| `00-overview.md`              | This file. Project context and high-level summary.|
| `01-project-structure.md`     | Directory layout and file organization.           |
| `02-architecture.md`          | Component architecture and design patterns.       |
| `03-routing-and-navigation.md`| Router configuration and navigation flows.        |
| `04-authentication.md`        | Auth flow, token lifecycle, and Google OAuth.      |
| `05-api-layer.md`             | API client setup and service module contracts.     |
| `06-feature-modules.md`       | Per-feature module deep dive.                     |
| `07-state-management.md`      | State patterns, events, and data flow.            |
| `08-deployment.md`            | Build pipeline, Docker, Nginx, and env config.    |
| `09-design-system.md`         | Styling tokens, component library, and typography.|
