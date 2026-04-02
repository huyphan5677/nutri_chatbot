# State Management

This document describes how state is managed across the Nutri frontend application, including local component state, persistence mechanisms, cross-component communication, and real-time data synchronization.

---

## 1. State Management Approach

The application does **not** use a global state management library (Redux, Zustand, Jotai, etc.). All state is managed through a combination of:

| Mechanism                    | Scope                    | Persistence       |
| ---------------------------- | ------------------------ | ------------------ |
| React `useState`             | Component-local          | None (in-memory)   |
| React `useRef`               | Component-local          | None (in-memory)   |
| `localStorage`               | Cross-session            | Browser storage    |
| React Router `location.state`| Cross-page navigation    | Navigation history |
| Browser `CustomEvent`        | Cross-component tree     | None (fire-and-forget) |
| URL hash fragments           | Cross-page               | URL bar            |

---

## 2. Local Component State

All data-fetching components manage their own state using `useState` and `useEffect`. There are no shared contexts or providers for domain data.

### Typical Pattern

```tsx
export const SomePage = () => {
  const [data, setData] = useState<DataType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await someApi.getData();
        setData(result);
      } catch (e) {
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // render...
};
```

### Implications

- Data is refetched every time a component mounts (navigating to a page always triggers a fresh fetch).
- There is no caching layer. If the same API is called from multiple components (e.g., `/auth/me`), each component makes its own independent request.
- When the user navigates away and back, all state is lost and rebuilt.

---

## 3. Persistent State (localStorage)

### Token Storage

The primary use of `localStorage` is storing the JWT authentication token:

```
Key: "nutri_token"
Value: JWT string (e.g., "eyJhbGciOiJIUzI1NiIs...")
```

### Read Locations

| Component / Module    | Reads `nutri_token`        | Purpose                              |
| --------------------- | -------------------------- | ------------------------------------ |
| `shared/api/client.ts`| Axios interceptor          | Attach Bearer token to API calls     |
| `AuthGuard`           | On mount                   | Route access check                   |
| `MainLayout`          | On mount                   | Onboarding status check              |
| `Navbar`              | On mount                   | Fetch user + dashboard status        |
| `chatApi.ts`          | Per streaming request      | Attach token to SSE fetch            |
| `recipesApi.ts`       | Per request                | Attach token to fetch calls          |
| `systemApi.ts`        | Per request                | Attach token to fetch calls          |
| Multiple components   | On mount                   | Early return if no token             |

### Write Locations

| Component         | Operation            | Trigger              |
| ----------------- | -------------------- | -------------------- |
| `AuthModal`       | `setItem`            | Successful login     |
| `Navbar`          | `removeItem`         | User logout          |

---

## 4. Navigation State

React Router's `location.state` is used for passing ephemeral data between pages:

### Active State Transfers

| Source              | Target        | State Key         | Value                                    | Purpose                                |
| ------------------- | ------------- | ----------------- | ---------------------------------------- | -------------------------------------- |
| `DashboardHeader`   | `ChatScreen`  | `initialPrompt`   | `"Create a N-day meal plan for me"`      | Auto-send prompt on chat page load     |
| `Navbar` (notif)    | `ChatScreen`  | `sessionId`       | UUID string                              | Auto-select a chat session             |

### State Lifecycle

Navigation state follows a produce-consume-clear pattern:

1. **Producer** sets state via `navigate("/chat", { state: { key: value } })`.
2. **Consumer** reads state via `location.state?.key` in a `useEffect`.
3. **Consumer** clears state immediately via `navigate(pathname, { replace: true, state: {} })`.

The `replace: true` flag ensures the stateful entry is not preserved in browser history, preventing re-triggering on back/forward navigation.

---

## 5. Cross-Component Communication (CustomEvent)

For components that are not in a React parent-child relationship, the application uses browser `CustomEvent` dispatched on `window`.

### Event Registry

| Event Name             | Payload Shape                                    | Dispatcher(s)                | Listener(s)      |
| ---------------------- | ------------------------------------------------ | ---------------------------- | ----------------- |
| `chatSessionRead`      | `{ sessionId: string }`                          | ChatScreen, Navbar           | Navbar            |
| `groceryListUpdated`   | (none)                                           | ShoppingModal                | Navbar            |
| `shoppingCompleted`    | `{ orderId: string, mealPlanName: string }`      | Navbar (polling detection)   | GroceryListDashboard |

### Dispatch Pattern

```typescript
// Dispatch
window.dispatchEvent(
  new CustomEvent("chatSessionRead", {
    detail: { sessionId: "abc-123" }
  })
);

// Listen
useEffect(() => {
  const handler = (e: Event) => {
    const { sessionId } = (e as CustomEvent).detail;
    // handle event
  };
  window.addEventListener("chatSessionRead", handler);
  return () => window.removeEventListener("chatSessionRead", handler);
}, []);
```

### Event Flow: Chat Read Notification

```
User opens a chat session
    |
    v
ChatScreen marks session as read (API call)
    |
    v
ChatScreen dispatches "chatSessionRead" event
    |
    v
Navbar listener receives event
    |
    +--> Removes session from unreadSessions
    +--> Decrements unreadCount
    +--> UI re-renders (notification badge updates)
```

### Event Flow: Shopping Completion

```
Navbar polls /system/dashboard-status every 5 seconds
    |
    v
New completed shopping order detected (not in seenShoppingOrdersRef)
    |
    v
Navbar dispatches "shoppingCompleted" CustomEvent
    |
    v
GroceryListDashboard listener receives event
    |
    +--> Shows toast notification
    +--> Refreshes grocery list data
```

---

## 6. Polling and Real-Time Data

### Polling Intervals

| Component       | Endpoint Polled                    | Interval | Loading Behavior              |
| --------------- | ---------------------------------- | -------- | ----------------------------- |
| `Navbar`        | `GET /system/dashboard-status`     | 5s       | Silent (no loading spinner)   |
| `ChatScreen`    | `chatApi.getSessions()`            | 5s       | Silent                        |
| `LogsPage`      | `fetchLogs(type, lines)`           | 3s       | Silent (when auto-refresh on) |

### Dashboard Status Response

The Navbar's single polling endpoint returns a consolidated status object:

```typescript
{
  unread_count: number;
  unread_sessions: Array<{ id: string; title: string }>;
  grocery_count: number;
  inventory_count: number;
  menu_count: number;
  shopping_notifications: Array<{
    order_id: string;
    status: string;
    meal_plan_name: string;
  }>;
}
```

This single-endpoint approach minimizes the number of polling requests while providing all notification data needed by the Navbar.

### Seen Shopping Orders

The Navbar uses a `useRef<Set<string>>` (`seenShoppingOrdersRef`) to track which shopping order IDs have already been seen. This prevents duplicate `shoppingCompleted` events:

- On initial load, all order IDs are added to the seen set without dispatching events.
- On subsequent polls, only newly appeared `completed` orders trigger events.
- The `initialLoadDoneRef` flag distinguishes the first poll from subsequent ones.

---

## 7. Form State

### Onboarding Quiz (QuizWizard)

The multi-step onboarding form maintains a single aggregated state object:

```typescript
const [formData, setFormData] = useState({
  userPrefs: { diet_mode: "", budget_level: "" },
  members: [emptyMember()],    // Array of family member profiles
  equipment: [],                // Selected kitchen equipment IDs
});
```

Each step component receives the relevant slice and an `onChange` callback. The wizard component remains the single source of truth.

### Validation

Form validation is performed in the wizard's `handleNext` function before step transitions:

```typescript
const validateRequiredMember = () => {
  const firstMember = formData.members[0];
  const errors: Partial<Record<RequiredMemberField, boolean>> = {};
  if (!firstMember?.name.trim()) errors.name = true;
  // ... additional field checks
  return errors;
};
```

Validation errors are displayed as:
1. A banner message (`stepError` state) at the top of the form.
2. Red border highlighting on individual fields (`requiredFieldErrors` state).

---

## 8. Toast Notifications

The `ChatScreen` implements a simple toast system using local state:

```typescript
const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

const showToast = (type, message) => {
  setToast({ type, message });
  toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
};
```

This is a component-local implementation, not a global toast system. Other components that need toast-style feedback implement their own patterns.

---

## 9. State Architecture Summary

```
+-------------------------------+
|        localStorage           |
|  nutri_token (JWT string)     |
+-------------------------------+
            |
+-----------v-------------------+
|     AuthGuard / MainLayout    |
|  (reads token, gates access)  |
+-------------------------------+
            |
+-----------v-------------------+     +---------------------------+
|    Feature Components         |<--->|   Browser CustomEvent     |
|  (local useState/useEffect)   |     |   (cross-tree messaging)  |
+-------------------------------+     +---------------------------+
            |
+-----------v-------------------+
|    API Service Modules        |
|  (stateless, return Promises) |
+-------------------------------+
            |
+-----------v-------------------+
|    Backend REST API           |
|  (single source of truth)     |
+-------------------------------+
```
