# Nutri Frontend

AI-powered meal planning and smart grocery shopping platform.

Built with React 18, TypeScript, Vite 5, and Tailwind CSS 3.4.

---

## Prerequisites

- Node.js 20+
- npm 9+
- Backend API running (FastAPI at port 8000)

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

Copy the example file and fill in the values:

```bash
cp ".env _example" .env
```

| Variable                | Description                | Example                  |
| ----------------------- | -------------------------- | ------------------------ |
| `VITE_API_URL`          | Backend API base URL       | `/api/v1`                |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID | `811266275321-klsl64...` |

---

## Development vs Docker Proxy

The dev server proxies `/api` requests to the backend. The proxy target in `vite.config.ts` must be set according to your environment:

**For local development** (backend running on host machine):

```typescript
// vite.config.ts
server: {
  proxy: {
    "/api": {
      // target: "http://backend:8000",
      target: "http://localhost:8000",  // <-- uncomment this line
      changeOrigin: true,
      secure: false,
    },
  },
},
```

**For Docker / building the image** (backend on Docker network):

```typescript
// vite.config.ts
server: {
  proxy: {
    "/api": {
      target: "http://backend:8000",    // <-- uncomment this line
      // target: "http://localhost:8000",
      changeOrigin: true,
      secure: false,
    },
  },
},
```

> **Important:** Before running `docker build`, make sure the proxy target is set
> to `http://backend:8000`. The Vite dev server proxy is only used during
> `npm run dev`; in production the Nginx reverse proxy handles API routing
> (see `nginx.conf`). However, the build step (`npm run build`) runs inside
> the Docker container where the network context matters.

---

## NPM Scripts

| Script    | Command                 | Description                              |
| --------- | ----------------------- | ---------------------------------------- |
| `dev`     | `vite`                  | Start dev server with HMR                |
| `build`   | `tsc && vite build`     | Type-check and produce production bundle |
| `lint`    | `eslint . --ext ts,tsx` | Run ESLint (zero-warning threshold)      |
| `preview` | `vite preview`          | Preview production build locally         |

---

## Docker Build and Deployment

### Build the image

```bash
docker build -t nutri-frontend:latest .
```

### Tag and push

```bash
docker tag nutri-frontend:latest <your-docker-hub>/nutri-frontend:<DDMMYYYY_HHMM>
docker push <your-docker-hub>/nutri-frontend:<DDMMYYYY_HHMM>
```

---

## Project Structure

```
src/
  main.tsx                 # Entry point (React DOM, providers)
  index.css                # Tailwind directives and global styles
  app/
    router.tsx             # Route definitions
  components/              # Shared UI components (Button, Modal, Navbar, Footer)
  features/                # Feature modules
    auth/                  # Authentication (AuthGuard, AuthModal)
    blog/                  # Blog / Inspiration page
    chat/                  # AI Chat assistant (SSE streaming)
    cooking/               # Recipe discovery and collections
    dashboard/             # User landing page
    inventory/             # Fridge inventory management
    meal-planner/          # Meal plans and grocery lists
    onboarding/            # User onboarding quiz
    profile/               # Account settings
    system/                # System logs viewer
  pages/
    HomePage.tsx           # Public landing page
  shared/
    api/client.ts          # Axios instance with auth interceptor
    layouts/MainLayout.tsx # Authenticated app shell
```

Each feature module follows the convention:

```
features/<name>/
  api/          # API service functions
  components/   # Feature-scoped React components
  pages/        # Page-level components
  types/        # TypeScript interfaces
```

---

## Tech Stack

| Category    | Technology                   |
| ----------- | ---------------------------- |
| Framework   | React 18                     |
| Language    | TypeScript 5                 |
| Build Tool  | Vite 5                       |
| Styling     | Tailwind CSS 3.4             |
| Routing     | React Router 6               |
| HTTP Client | Axios                        |
| Icons       | Lucide React                 |
| Markdown    | react-markdown + remark-gfm  |
| OAuth       | @react-oauth/google          |
| Deployment  | Docker (multi-stage) + Nginx |

---

## Key Features

- **Authentication**: Email/password and Google OAuth 2.0 login.
- **Onboarding**: Multi-step quiz for dietary preferences, household profiles, and kitchen equipment.
- **AI Chat**: Real-time streaming chat (SSE) with tool-invocation visibility and meal plan generation.
- **Meal Planning**: View, manage, and archive AI-generated meal plans.
- **Grocery Shopping**: Integrated shopping with Lotte Mart and WinMart APIs, fridge-aware deductions, and cost-optimized strategies.
- **Fridge Inventory**: Category-based inventory management with bulk import.
- **Recipe Discovery**: Search, filter, web-search, and save recipes to collections.
- **System Logs**: Real-time log viewer with auto-refresh for app and AI agent logs.

---

## Documentation

Detailed technical documentation is available in the `docs/` directory:

| Document                                                          | Description                                 |
| ----------------------------------------------------------------- | ------------------------------------------- |
| [00-overview.md](docs/00-overview.md)                             | Project context and high-level architecture |
| [01-project-structure.md](docs/01-project-structure.md)           | Directory layout and module organization    |
| [02-architecture.md](docs/02-architecture.md)                     | Design patterns and data flow               |
| [03-routing-and-navigation.md](docs/03-routing-and-navigation.md) | Router, guards, and navigation flows        |
| [04-authentication.md](docs/04-authentication.md)                 | Auth flow, token lifecycle, Google OAuth    |
| [05-api-layer.md](docs/05-api-layer.md)                           | API client and service module contracts     |
| [06-feature-modules.md](docs/06-feature-modules.md)               | Per-feature module deep dive                |
| [07-state-management.md](docs/07-state-management.md)             | State patterns and data flow                |
| [08-deployment.md](docs/08-deployment.md)                         | Build, Docker, Nginx, and env configuration |
| [09-design-system.md](docs/09-design-system.md)                   | Styling tokens, components, and typography  |
