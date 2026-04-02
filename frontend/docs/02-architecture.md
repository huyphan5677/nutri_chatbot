# Architecture and Design Patterns

This document describes the architectural decisions, component patterns, and data flow model used across the Nutri frontend application.

---

## 1. Architectural Style

The application follows a **feature-sliced** architecture adapted for React SPAs. The key architectural principle is **co-location**: each feature module encapsulates its own API calls, components, pages, and types, reducing cross-feature coupling.

```
                   +-------------------+
                   |    main.tsx       |  Entry point
                   |  (Providers)      |  GoogleOAuthProvider, RouterProvider
                   +--------+----------+
                            |
                   +--------v----------+
                   |    Router         |  Route tree definition
                   +--------+----------+
                            |
            +---------------+---------------+
            |                               |
   +--------v----------+         +---------v---------+
   |  Public Routes     |         |  Protected Routes  |
   |  - HomePage        |         |  - AuthGuard       |
   +--------------------+         |    - MainLayout    |
                                  |      - Outlet      |
                                  +--------------------+
```

### Layer Hierarchy

1. **Entry Layer** (`main.tsx`): Bootstraps React, mounts providers.
2. **Routing Layer** (`app/router.tsx`): Defines all routes and their nesting.
3. **Layout Layer** (`shared/layouts/MainLayout.tsx`): Provides the authenticated application shell.
4. **Feature Layer** (`features/*/`): Self-contained feature modules.
5. **Shared Layer** (`shared/`, `components/`): Cross-cutting utilities and UI primitives.

---

## 2. Component Architecture

### 2.1 Provider Hierarchy

```
React.StrictMode
  GoogleOAuthProvider (clientId)
    RouterProvider (router)
```

- `GoogleOAuthProvider` wraps the entire app to make the `useGoogleLogin` hook available anywhere.
- `RouterProvider` supplies the React Router context.
- There is no dedicated context for user state, theme, or feature flags. These are managed locally.

### 2.2 Layout Components

The `MainLayout` component serves as the authenticated shell. It:

1. Renders the `Navbar` (fixed height, sticky at top).
2. Provides a flex-column layout with `overflow-y: auto` on the main content area.
3. Renders the `Footer` conditionally (excluded on the chat page).
4. Performs a one-time onboarding status check on mount.

The main content area has `id="scroll-root"`, which is referenced by child components (e.g., onboarding wizard) to programmatically reset scroll position.

### 2.3 Component Patterns

The codebase uses the following React patterns:

| Pattern                    | Usage                                                  |
| -------------------------- | ------------------------------------------------------ |
| Functional components      | All components are function components with hooks.     |
| Controlled forms           | Form inputs use `useState` with `onChange` handlers.   |
| Render-based conditionals  | `{condition && <Component />}` pattern throughout.     |
| Ref-based DOM access       | `useRef` for scroll containers, dropdowns, textareas. |
| Effect-based data fetching | `useEffect` with async functions for API calls.        |
| Portal-based modals        | `createPortal` to `document.body` for modals.          |
| Callback props             | Parent-to-child communication via callback functions.  |
| Location state             | Router state for passing data between pages.           |

### 2.4 No Abstraction Layers for Business Logic

The application does not use custom hooks to abstract business logic into reusable units. Each component manages its own data fetching, state, and side effects inline. This is a deliberate trade-off for development speed and simplicity at the current project scale.

When the application grows, extracting custom hooks (e.g., `useUser`, `useMealPlan`, `useChatStream`) would be the recommended refactor path.

---

## 3. Data Flow Model

### 3.1 Request Flow

```
Component (useEffect)
    |
    v
API Service Module (features/<feature>/api/<feature>Api.ts)
    |
    v
Shared Axios Client (shared/api/client.ts)
    |  - Attaches Bearer token from localStorage
    |  - Sets Content-Type: application/json
    v
Backend API (FastAPI at /api/v1/*)
    |
    v
JSON Response
    |
    v
Component setState()
    |
    v
React Re-render
```

### 3.2 Streaming Flow (Chat)

The chat feature uses a distinct streaming data flow:

```
User sends message
    |
    v
chatApi.sendStreamMessage()
    |  - POST /api/v1/chat/stream
    |  - Returns ReadableStream (SSE)
    v
Stream reader loop
    |  - Parses SSE event blocks
    |  - Dispatches events: init, chunk, tool_start, tool_end,
    |    message_break, persisted_message, error
    v
Event handlers update messages state incrementally
    |
    v
React re-renders with accumulated content
```

### 3.3 Cross-Component Communication

Components that are not in a parent-child relationship communicate through browser `CustomEvent`:

| Event Name             | Dispatched By    | Consumed By  | Payload                    |
| ---------------------- | ---------------- | ------------ | -------------------------- |
| `chatSessionRead`      | ChatScreen, Navbar| Navbar       | `{ sessionId: string }`   |
| `groceryListUpdated`   | ShoppingModal    | Navbar       | (none)                     |
| `shoppingCompleted`    | Navbar           | GroceryList  | `{ orderId, mealPlanName }`|

This pattern avoids the need for a global state management library while enabling cross-tree communication.

---

## 4. API Layer Design

### 4.1 Dual-Pattern API Calls

The codebase uses two patterns for HTTP calls, which is a known inconsistency:

**Pattern A: Shared Axios Instance** (used by chat, menus, grocery, inventory, profile APIs)
```typescript
import { api } from "@/shared/api/client";

export const menuApi = {
  getCurrentMenu: async (): Promise<MealPlanResponse> => {
    const response = await api.get("/menus/current");
    return response.data;
  },
};
```

**Pattern B: Direct `fetch()` Calls** (used by recipes, collections, system APIs)
```typescript
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("nutri_token");
  // ...manually construct headers
};

export const searchRecipes = async (): Promise<RecipeSearchResponse> => {
  const res = await fetch(`/api/v1/recipes`, { headers: getAuthHeaders() });
  return res.json();
};
```

Pattern B modules hardcode the `/api/v1` prefix and manually read the token from `localStorage`, bypassing the shared Axios interceptor. This is a legacy pattern that should ideally be migrated to Pattern A for consistency.

### 4.2 Type Safety

Each API module co-locates its TypeScript interfaces:
- Request payload types (e.g., `ShoppingRequest`, `UpdateGroceryItemPayload`).
- Response types (e.g., `MealPlanResponse`, `ShoppingOrderResponse`).
- Domain entity types (e.g., `GroceryItemDTO`, `RecipeDTO`).

Types are defined in the same API file or in a dedicated `types/` directory within the feature module.

---

## 5. Error Handling Strategy

### API Errors
- API service modules throw on non-2xx responses.
- Components catch errors in `try/catch` blocks within `useEffect` or event handlers.
- Error state is stored locally in the component via `useState`.
- There is no global error boundary or centralized error reporting.

### User-Facing Errors
- Auth errors are normalized through `normalizeAuthError()` to provide friendly messages.
- Toast notifications (chat feature) show success/error messages with auto-dismiss.
- Form validation errors are displayed inline (onboarding quiz).

### Network Errors
- The Axios instance does not have a response interceptor for 401 handling. If a token expires, individual API calls will fail silently.
- The chat streaming flow wraps `fetch` in a try/catch and specifically handles `AbortError` for user-cancelled requests.

---

## 6. Performance Considerations

### Polling
The `Navbar` component polls `/system/dashboard-status` every 5 seconds.  
The `ChatScreen` component polls session list every 5 seconds.  
These are lightweight GET requests but represent continuous network activity.

### Large Components
Several components exceed recommended single-file size:
- `ChatScreen.tsx` (~1,435 lines, ~57KB)
- `ShoppingModal.tsx` (~50KB)
- `MealPlannerDashboard.tsx` (~35KB)
- `HomePage.tsx` (~33KB)

These monolithic components combine UI rendering, data fetching, and state management. Decomposition into smaller components and custom hooks would improve maintainability.

### Bundle Optimization
- No code splitting or lazy loading is currently implemented. All routes are eagerly imported in `router.tsx`.
- Adding `React.lazy()` with `Suspense` boundaries per route would reduce the initial bundle size.
- The `lucide-react` icon library supports tree-shaking, and individual icon imports (e.g., `import { Send } from "lucide-react"`) ensure only used icons are bundled.
