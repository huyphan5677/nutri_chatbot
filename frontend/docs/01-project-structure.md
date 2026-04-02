# Project Structure

This document describes the directory layout, file naming conventions, and the rationale behind the module organization.

---

## 1. Root Directory

```
frontend/
  .env                    # Local environment variables (gitignored in practice)
  .env _example           # Template showing required env vars
  Dockerfile              # Multi-stage build (Node build -> Nginx serve)
  env-config.sh           # Runtime env injection script for Docker
  index.html              # Vite HTML entry point with SEO meta tags
  nginx.conf              # Production Nginx configuration
  package.json            # Dependencies and npm scripts
  postcss.config.js       # PostCSS pipeline (Tailwind + Autoprefixer)
  tailwind.config.js      # Tailwind design tokens and theme extensions
  tsconfig.json           # TypeScript compiler options (strict, bundler mode)
  tsconfig.node.json      # TypeScript config for Vite/Node tooling
  vite.config.ts          # Vite build config, path aliases, dev proxy
  public/                 # Static assets served at root (images, favicon)
  dist/                   # Production build output (gitignored)
  docs/                   # This documentation set
  src/                    # Application source code
```

---

## 2. Source Directory (`src/`)

The `src/` directory follows a **feature-sliced** organization pattern with the following top-level segments:

```
src/
  main.tsx                # React DOM render, GoogleOAuthProvider wrapper
  index.css               # Tailwind directives, global base styles
  vite-env.d.ts           # Vite type declarations
  app/                    # Application-level configuration
    router.tsx            # Central route definitions
  components/             # Shared, reusable UI components
    auth/
      ProtectedRoute.tsx  # Legacy route guard (not actively used in router)
    ui/
      Button.tsx          # Polymorphic button with variant system
      Footer.tsx          # Global footer with newsletter and links
      Modal.tsx           # Portal-based modal with backdrop and escape handling
      Navbar.tsx          # Global navigation bar with notifications and polling
  features/               # Feature modules (domain-driven)
    auth/                 # Authentication feature
    blog/                 # Blog / Inspiration page
    chat/                 # AI Chat assistant (SSE streaming)
    cooking/              # Recipe discovery and collections
    dashboard/            # User landing page after login
    inventory/            # Fridge inventory management
    meal-planner/         # Meal plan and grocery list management
    onboarding/           # User onboarding quiz
    profile/              # Account settings and household setup
    system/               # System logs viewer
  pages/                  # Top-level page components not tied to a feature
    HomePage.tsx          # Public landing page (pre-auth)
  shared/                 # Cross-cutting shared code
    api/
      client.ts           # Axios instance, base URL resolution, auth interceptor
    layouts/
      MainLayout.tsx      # Authenticated shell (Navbar + Outlet + Footer)
```

---

## 3. Feature Module Convention

Each feature module under `features/` follows a consistent internal structure:

```
features/<feature-name>/
  index.ts                # (optional) Barrel export file
  api/                    # API service functions for this feature
    <feature>Api.ts       # Typed API calls using shared Axios client
  components/             # React components scoped to this feature
    <Component>.tsx       # Feature-specific UI components
  pages/                  # Page-level components for this feature
    <Page>.tsx            # Full-page components rendered by the router
  types/                  # TypeScript interfaces and type definitions
    <feature>.ts          # Domain types for API responses and internal state
```

Not every feature uses all sub-directories. The actual structure adapts to the complexity of the feature:

| Feature        | Has `api/` | Has `components/` | Has `pages/` | Has `types/` |
| -------------- | ---------- | ------------------ | ------------ | ------------ |
| auth           | No         | Yes                | No           | No           |
| blog           | No         | No                 | Yes          | No           |
| chat           | Yes        | Yes                | No           | Yes          |
| cooking        | Yes        | Yes                | Yes          | No           |
| dashboard      | No         | Yes                | Yes          | No           |
| inventory      | Yes        | Yes                | No           | No           |
| meal-planner   | Yes        | Yes                | No           | No           |
| onboarding     | No         | Yes                | Yes          | No           |
| profile        | Yes        | Yes                | Yes          | No           |
| system         | Yes        | No                 | Yes          | No           |

---

## 4. Shared Layer (`shared/`)

The `shared/` directory contains cross-cutting utilities that are consumed by multiple feature modules:

### `shared/api/client.ts`
- Creates and exports a configured Axios instance (`api`).
- Resolves the API base URL from either `window.ENV.VITE_API_URL` (runtime, for Docker) or `import.meta.env.VITE_API_URL` (build-time, for local dev).
- Attaches a request interceptor that reads the JWT from `localStorage` and sets the `Authorization` header on every outgoing request.

### `shared/layouts/MainLayout.tsx`
- The authenticated application shell rendered as a route layout.
- Contains the `Navbar` at the top and a scrollable `main` area with an `<Outlet />` for child routes.
- Conditionally renders the `Footer` (hidden on the chat page for full-height UX).
- Performs a one-time onboarding check on mount: fetches `/auth/me` and redirects to `/onboarding` if the user has not completed setup, or redirects away from `/onboarding` if already completed.
- Shows a loading spinner during the onboarding check to prevent content flash.

---

## 5. Components Layer (`components/`)

The `components/` directory contains UI primitives and layout components that are reused across multiple features. These are intentionally kept generic and stateless where possible.

### `components/ui/Button.tsx`
- Supports four variants: `primary`, `secondary`, `outline`, `ghost`.
- Uses `clsx` + `tailwind-merge` for safe class composition.
- Exports a `cn()` utility function for merging Tailwind classes.

### `components/ui/Modal.tsx`
- Renders via `createPortal` to `document.body`.
- Handles `Escape` key dismissal and click-outside-to-close.
- Locks body scroll while open (`document.body.style.overflow`).
- Provides a close button and accepts arbitrary `children`.

### `components/ui/Navbar.tsx`
- The most complex shared component (~660 lines).
- Polls `/system/dashboard-status` every 5 seconds for live counters (grocery, inventory, menu, unread chats, shopping notifications).
- Manages desktop and mobile navigation with responsive breakpoints.
- Handles notification dropdowns (chat unread, shopping order completions).
- Dispatches `CustomEvent`s for cross-component communication.
- Contains inline user dropdown with profile, settings, logs, and logout actions.

### `components/ui/Footer.tsx`
- Static marketing footer with link columns, social icons, and a newsletter subscribe form.

### `components/auth/ProtectedRoute.tsx`
- A simple token-presence check that redirects to `/` if `nutri_token` is absent.
- Note: This component is not actively used in the current router configuration. The `AuthGuard` component in `features/auth/` fulfills this role instead.

---

## 6. Pages Layer (`pages/`)

Contains page components that exist outside the feature module structure.

### `pages/HomePage.tsx`
- The public landing page rendered at the root path `/`.
- A large (~33KB), self-contained component with hero section, feature showcase, how-it-works flow, testimonials, and CTA sections.
- Contains the `AuthModal` integration for login/signup from the landing page.
- This page is the only route that does not require authentication.

---

## 7. File Naming Conventions

| Convention               | Example                    | Usage                        |
| ------------------------ | -------------------------- | ---------------------------- |
| PascalCase               | `ChatScreen.tsx`           | React components             |
| camelCase                | `chatApi.ts`               | API service modules          |
| camelCase                | `chat.ts`                  | Type definition files        |
| kebab-case               | `meal-planner/`            | Feature directory names      |
| PascalCase               | `MainLayout.tsx`           | Layout components            |
| lowercase                | `client.ts`, `router.tsx`  | Infrastructure/config files  |
