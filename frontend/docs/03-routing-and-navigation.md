# Routing and Navigation

This document describes the routing configuration, guard mechanisms, navigation patterns, and page transitions used in the Nutri frontend.

---

## 1. Router Configuration

The application uses `react-router-dom` v6 with `createBrowserRouter`. The route tree is defined in `src/app/router.tsx`.

### Route Tree

```
/                           -> HomePage          (public, no layout)
<AuthGuard>                                      (redirect to / if no token)
  <MainLayout>                                   (Navbar + scrollable Outlet + Footer)
    /dashboard              -> DashboardPage
    /cooking                -> WhatsCookingPage
    /collections/:id        -> CollectionDetailPage
    /blog                   -> BlogPage
    /profile                -> ProfilePage
    /chat                   -> ChatScreen
    /menus                  -> MealPlannerDashboard
    /grocery                -> GroceryListDashboard
    /inventory              -> InventoryDashboard
    /onboarding             -> OnboardingScreen
    /logs                   -> LogsPage
```

### Key Points

- All routes except `/` are wrapped in `AuthGuard`, which checks for `nutri_token` in `localStorage`.
- All authenticated routes share `MainLayout` as a parent layout route.
- There is no 404/catch-all route defined. Unmatched URLs will show a blank page.
- All route components are eagerly imported (no lazy loading).

---

## 2. Auth Guard

### `AuthGuard` (`features/auth/components/AuthGuard.tsx`)

A simple route-level guard that checks for the presence of `nutri_token` in `localStorage`:

```
Token exists?
  YES -> Render <Outlet /> (child routes)
  NO  -> <Navigate to="/" replace />
```

This guard does **not** validate token expiry, structure, or authenticity. It is purely a presence check. Token validation is performed server-side on each API call.

### `ProtectedRoute` (`components/auth/ProtectedRoute.tsx`)

A functionally identical component that exists in the shared `components/` directory. It is **not used** in the current router configuration and appears to be a legacy artifact.

---

## 3. Onboarding Gate

Beyond the `AuthGuard`, the `MainLayout` implements a secondary gate that checks whether the user has completed the onboarding process.

### Flow

```
MainLayout mounts
    |
    v
Check: onboardingChecked flag?
    |
    +--> YES: Skip check, render content
    |
    +--> NO: Fetch GET /auth/me
              |
              v
         user.diet_mode exists?
              |
              +--> YES (onboarding complete)
              |      |
              |      +--> Currently on /onboarding?
              |             YES -> Redirect to /dashboard
              |             NO  -> Render content normally
              |
              +--> NO (onboarding incomplete)
                     |
                     +--> Currently on /onboarding?
                            YES -> Render content normally
                            NO  -> Redirect to /onboarding
```

### Implementation Details

- The check runs once per `MainLayout` mount using a `onboardingChecked` state flag.
- While the check is in progress, a full-screen loading spinner is displayed to prevent content flash.
- The `diet_mode` field on the user object serves as the indicator of onboarding completion.
- This pattern ensures users cannot access any feature page without completing onboarding.

---

## 4. Navigation Patterns

### 4.1 Programmatic Navigation

Navigation is performed using React Router's `useNavigate` hook. Common patterns include:

**Simple navigation:**
```tsx
navigate("/dashboard");
```

**Navigation with state (cross-page data passing):**
```tsx
// Pass initial prompt to chat
navigate("/chat", {
  state: { initialPrompt: `Create a ${mealCount}-day meal plan for me` }
});

// Pass target session ID to chat
navigate("/chat", { state: { sessionId: session.id } });
```

**Hash-based section targeting:**
```tsx
// Navigate to cooking page and scroll to section
navigate("/cooking#discover-recipes");
```

### 4.2 Navigation State Consumption

The `ChatScreen` component demonstrates how navigation state is consumed:

```tsx
// Auto-send a prompt passed via navigation state
useEffect(() => {
  if (location.state?.initialPrompt && !promptSentRef.current) {
    promptSentRef.current = true;
    const prompt = location.state.initialPrompt;
    navigate(location.pathname, { replace: true, state: {} }); // Clear state
    setTimeout(() => sendMessage(prompt), 50);
  }
}, [location.state?.initialPrompt]);

// Auto-select a chat session passed via navigation state
useEffect(() => {
  if (location.state?.sessionId && location.state.sessionId !== threadId) {
    handleSelectSession(location.state.sessionId);
    // Clear sessionId from state
    navigate(location.pathname, { replace: true, state: {} });
  }
}, [location.state?.sessionId]);
```

Note the `replace: true` pattern used to clear navigation state after consumption, preventing re-triggering on browser back/forward navigation.

### 4.3 Logout Flow

Logout is handled in the `Navbar` component:

```tsx
const handleLogout = () => {
  localStorage.removeItem("nutri_token");
  window.location.href = "/"; // Full page reload
};
```

A full page reload (`window.location.href`) is used instead of `navigate("/")` to ensure all React state is cleared and re-initialized cleanly.

---

## 5. Active Route Indication

The `Navbar` component applies visual indicators to the currently active route.

### Desktop Navigation

Active routes get a bold red text color and a visible bottom underline:
```
text-[#FF5C5C] font-bold after:scale-x-100
```

Inactive routes have a hover animation that scales the underline from right-to-left:
```
text-gray-800 hover:text-[#FF5C5C] after:origin-bottom-right after:scale-x-0
hover:after:origin-bottom-left hover:after:scale-x-100
```

### Mobile Navigation

Active routes use the same color scheme without the underline animation:
```
text-[#FF5C5C] font-bold      // active
text-gray-800 font-medium     // inactive
```

---

## 6. Route-to-Feature Mapping

| Route                | Feature Module   | Entry Component            | Description                     |
| -------------------- | ---------------- | -------------------------- | ------------------------------- |
| `/`                  | (pages)          | `HomePage`                 | Public landing page             |
| `/dashboard`         | dashboard        | `DashboardPage`            | User home with meal plan CTA    |
| `/cooking`           | cooking          | `WhatsCookingPage`         | Recipe discovery and search     |
| `/collections/:id`   | cooking          | `CollectionDetailPage`     | Single collection view          |
| `/blog`              | blog             | `BlogPage`                 | Inspiration / blog content      |
| `/profile`           | profile          | `ProfilePage`              | Account settings (tabbed)       |
| `/chat`              | chat             | `ChatScreen`               | AI chat assistant               |
| `/menus`             | meal-planner     | `MealPlannerDashboard`     | Meal plan viewer and manager    |
| `/grocery`           | meal-planner     | `GroceryListDashboard`     | Grocery shopping list           |
| `/inventory`         | inventory        | `InventoryDashboard`       | Fridge inventory manager        |
| `/onboarding`        | profile          | `OnboardingScreen`         | Post-login onboarding setup     |
| `/logs`              | system           | `LogsPage`                 | System and AI agent logs        |

Note: The `OnboardingScreen` component is imported from `features/profile/components/OnboardingScreen.tsx`, not from `features/onboarding/`. The `features/onboarding/` module contains a separate `OnboardingPage` used in a different flow context (pre-auth quiz).
