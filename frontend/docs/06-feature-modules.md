# Feature Modules

This document provides a deep dive into each feature module, covering its purpose, component composition, data flow, and key behavioral details.

---

## 1. Auth Feature (`features/auth/`)

### Purpose
Provides authentication UI components used by other features.

### Structure
```
auth/
  index.ts                    # Barrel: exports AuthModal
  components/
    AuthGuard.tsx             # Route guard (token-presence check)
    AuthModal.tsx             # Login/signup modal with Google OAuth
```

### Key Behaviors
- `AuthGuard`: Acts as a layout route wrapper. Redirects to `/` if no token. Renders `<Outlet />` if token exists.
- `AuthModal`: Self-contained modal supporting login (form-data), registration (JSON), and Google OAuth flows. Manages its own loading, error, and mode toggle state internally.
- The `index.ts` barrel export allows other modules to import as `import { AuthModal } from "@/features/auth"`.

---

## 2. Dashboard Feature (`features/dashboard/`)

### Purpose
The primary landing page after authentication. Provides a greeting, meal plan initiation CTA, and discovery cards.

### Structure
```
dashboard/
  components/
    DashboardHeader.tsx       # Greeting + meal count selector + "Let's plan" CTA
    GrocerySidebar.tsx        # Static grocery list sidebar (placeholder)
    MenuGrid.tsx              # Day-grouped meal grid display
    RecipeCard.tsx             # Single recipe card with swap action
  pages/
    DashboardPage.tsx         # Main dashboard page composition
```

### Key Behaviors

**DashboardHeader:**
- Displays time-appropriate greeting (morning/afternoon/evening) with user's name.
- Provides a counter (1-21) for selecting how many days to plan.
- "Let's plan" button navigates to `/chat` with an `initialPrompt` in location state:
  ```tsx
  navigate("/chat", {
    state: { initialPrompt: `Create a ${mealCount}-day meal plan for me` }
  });
  ```
- Features a mouse-tracking spotlight visual effect.

**DashboardPage:**
- Fetches the current user via `GET /auth/me` to get the display name.
- Renders discovery cards linking to `/cooking#discover-recipes`.

**MenuGrid / RecipeCard / GrocerySidebar:**
- These components are currently available but not actively rendered in `DashboardPage`. They appear to be designed for a future dashboard layout that displays the current meal plan inline.

---

## 3. Chat Feature (`features/chat/`)

### Purpose
The AI chat assistant interface with real-time streaming, session management, and meal plan generation integration.

### Structure
```
chat/
  api/
    chatApi.ts                # Chat service with REST + SSE streaming
  components/
    ChatScreen.tsx            # Full chat interface (~1,435 lines)
  types/
    chat.ts                   # ChatMessage, ChatSession, MealPlanDraft, ToolState
```

### Key Behaviors

**Session Management:**
- Sessions are listed in a collapsible left sidebar on desktop.
- Sessions are grouped by date: Today, Yesterday, Previous 7 Days, Older.
- Sessions can be renamed (inline edit with Enter/Escape) and deleted (with confirmation modal).
- Session list is polled every 5 seconds for updates.
- Unread sessions display a notification dot.

**Message Streaming:**
- Messages are sent via `sendStreamMessage` which opens an SSE connection.
- The response stream dispatches events incrementally:
  - `init`: Sets the thread ID for new conversations.
  - `chunk`: Appends text tokens to the assistant message (typing effect).
  - `tool_start`/`tool_end`: Shows the AI's "thought process" (tools being invoked).
  - `message_break`: Starts a new assistant message bubble within the same response.
  - `persisted_message`: Updates the local message ID with the server-persisted UUID.
  - `error`: Appends a system error message to the current bubble.

**Thought Process Viewer:**
- A collapsible section above each assistant message showing tool invocations.
- Displays a running timer during active thinking.
- Shows recognized tool names with friendly labels (e.g., `create_meal_plan` -> "Creating meal plan...").

**Meal Plan Draft:**
- When the AI creates a meal plan, a `meal_plan_draft` is attached to the message.
- A "Save Menu" button appears below the draft summary.
- Saving triggers `menuApi.saveMenuFromChat()` which persists the plan and generates a shopping list.
- The shopping list is injected as a follow-up assistant message.

**Quick Prompts:**
- The empty chat state shows suggested prompts (e.g., creating meal plans, quick recipes).
- Clicking a quick prompt auto-sends it as a message.

**Auto-Prompt from Dashboard:**
- When navigating from DashboardHeader, the `initialPrompt` from location state is auto-sent.
- A ref guard (`promptSentRef`) prevents double-sending.

**Auto-Resize Textarea:**
- The chat input uses a `<textarea>` that auto-resizes based on content, capped at 150px max height.

---

## 4. Meal Planner Feature (`features/meal-planner/`)

### Purpose
Manages meal plans (viewing, editing, archiving) and grocery shopping lists with integrated e-commerce shopping.

### Structure
```
meal-planner/
  api/
    menuApi.ts                # Meal plan CRUD operations
    groceryApi.ts             # Grocery list + shopping integration
  components/
    MealPlannerDashboard.tsx  # Meal plan list and detail viewer (~35KB)
    GroceryListDashboard.tsx  # Grocery list manager (~24KB)
    ShoppingModal.tsx         # Store selection and shopping flow (~50KB)
```

### Key Behaviors

**MealPlannerDashboard:**
- Lists all saved meal plans with status indicators (Active, Archived).
- Displays meals grouped by date with recipe details.
- Supports editing meal plan name and deleting plans.
- Provides "Start Shopping" interaction that opens the ShoppingModal.

**GroceryListDashboard:**
- Displays grocery items grouped by meal plan.
- Items can be marked as purchased (toggle), edited, or deleted.
- Supports bulk operations per meal plan group (delete all items for a plan).
- Listens for `shoppingCompleted` CustomEvent to auto-refresh when background shopping finishes.

**ShoppingModal:**
- Multi-step modal flow: select stores -> configure strategy -> view results.
- Integrates with two Vietnamese e-commerce APIs:
  - **Lotte Mart**: Branch selection from a dropdown.
  - **WinMart**: Province -> Store cascading selection.
- Shopping strategies: `lotte_priority`, `winmart_priority`, `cost_optimized`.
- Initiates async shopping via `groceryApi.startShopping()`.
- Polls `groceryApi.getShoppingOrder()` until the order completes.
- Displays results with product links, prices, fridge deductions, and total estimated cost.

---

## 5. Inventory Feature (`features/inventory/`)

### Purpose
Manages the user's fridge/pantry inventory with category-based organization.

### Structure
```
inventory/
  api/
    inventoryApi.ts           # Inventory CRUD + bulk add + category rename
  components/
    InventoryDashboard.tsx    # Full inventory manager (~21KB)
```

### Key Behaviors
- Items are grouped by category with expandable/collapsible sections.
- Supports inline editing of item name, quantity, category, and expiration date.
- Bulk add mode allows importing multiple items at once.
- Category rename propagates across all items in that category.
- The inventory is consumed by the shopping flow: the `FridgeCheckAgent` backend deducts available fridge items from shopping lists.

---

## 6. Cooking Feature (`features/cooking/`)

### Purpose
Recipe discovery, search, and collection management.

### Structure
```
cooking/
  api/
    recipesApi.ts             # Recipe search + collection CRUD
  components/
    CreateCollectionModal.tsx  # New collection creation form
    FilterModal.tsx           # Recipe search filter panel
    RecipeDetailModal.tsx     # Full recipe detail view
    SaveToCollectionMenu.tsx  # "Add to collection" dropdown
  pages/
    WhatsCookingPage.tsx      # Main recipe browsing page (~28KB)
    CollectionDetailPage.tsx  # Single collection view
```

### Key Behaviors

**WhatsCookingPage:**
- Two-section layout: Saved Collections (top) + Discover Recipes (bottom).
- Recipe search with text query, type filter, and max preparation time.
- Paginated results with infinite-scroll or load-more.
- Web search mode: uses AI to find recipes from the internet.
- Each recipe card shows a detail modal on click.

**Collections:**
- Users can create named collections and save recipes to them.
- Collection detail page shows all recipes in a collection.
- Recipes can be removed from collections.

**RecipeDetailModal:**
- Shows full recipe information: name, description, prep/cook time, calories.
- Renders instructions in markdown format.
- Provides actions to save to collection, edit, or delete.

---

## 7. Onboarding Feature (`features/onboarding/`)

### Purpose
Guided multi-step quiz for new users to capture dietary preferences, household profiles, and kitchen equipment.

### Structure
```
onboarding/
  components/
    QuizWizard.tsx            # Multi-step form wizard (reusable)
    QuizStep1.tsx             # Dietary preferences + budget level
    QuizStep2.tsx             # Family members with health profiles (~26KB)
    QuizStep3.tsx             # Kitchen equipment selection
  pages/
    OnboardingPage.tsx        # Standalone onboarding page (pre-auth flow)
```

### Key Behaviors

**QuizWizard (post-auth onboarding):**
- Three-step wizard with progress bar.
- Step validation: Step 2 requires all mandatory fields for the first household member.
- Supports pre-population from existing onboarding data (`initialData` prop).
- On completion, serializes form data into a structured payload and calls `onComplete` callback.

**QuizStep1:** Diet mode (standard, vegetarian, vegan, etc.) and budget level selection.

**QuizStep2:** Detailed household member profiles including:
- Name, relationship, age, gender, weight, height.
- Activity level, primary health goal.
- BMR/TDEE (auto-calculated or manual).
- Health profile: allergies, favorite dishes, health conditions.

**QuizStep3:** Kitchen equipment checklist (oven, microwave, air fryer, etc.).

**OnboardingPage (pre-auth):**
- A separate flow used on the landing page before authentication.
- After completing the quiz, shows the AuthModal for login/registration.
- Not used in the current router for authenticated users.

### Scroll Reset
Both `QuizWizard` and `OnboardingPage` programmatically reset the scroll position of the `#scroll-root` container when the step changes, preventing the view from staying at the bottom of long forms.

---

## 8. Profile Feature (`features/profile/`)

### Purpose
User account settings, household management, and various preference pages.

### Structure
```
profile/
  api/
    profileApi.ts             # Onboarding data CRUD
  components/
    ContactPreferencesPage.tsx
    DisplaySettingsPage.tsx
    HouseholdSetupPage.tsx    # Embeds QuizWizard for editing
    MyAccountsPage.tsx
    OnboardingScreen.tsx      # Post-auth onboarding entry (uses QuizWizard)
    PrivacySettingsPage.tsx
    ProfileSidebar.tsx        # Settings navigation menu
    RewardsPage.tsx
    ShoppingListHistoryPage.tsx
  pages/
    ProfilePage.tsx           # Tab-based profile layout
```

### Key Behaviors

**ProfilePage:**
- A tabbed interface with 8 sections (tabs 0-7).
- Tab 0 (My Profile): Collections and recipes overview.
- Tab 1 (Family & Kitchen): Embeds `HouseholdSetupPage` which reuses `QuizWizard`.
- Tabs 2-7: Various settings pages.

**OnboardingScreen:**
- The post-auth onboarding entry point used when the user has no `diet_mode`.
- Wraps `QuizWizard` and calls `profileApi.submitOnboarding()` on completion.
- After successful submission, navigates to `/dashboard`.

**HouseholdSetupPage:**
- Fetches existing onboarding data via `profileApi.getOnboarding()`.
- Passes it as `initialData` to `QuizWizard`.
- On save, calls `profileApi.updateOnboarding()` (PUT) to replace existing data.

---

## 9. Blog Feature (`features/blog/`)

### Purpose
Static blog/inspiration content page.

### Structure
```
blog/
  pages/
    BlogPage.tsx              # Blog landing page
```

### Key Behaviors
- Renders curated content cards for health tips, recipes, and nutrition articles.
- Currently static content without dynamic data fetching.

---

## 10. System Feature (`features/system/`)

### Purpose
System monitoring with real-time log viewing.

### Structure
```
system/
  api/
    systemApi.ts              # Log fetching endpoint
  pages/
    LogsPage.tsx              # Terminal-styled log viewer
```

### Key Behaviors
- Two log types: Application logs (`app`) and AI Agent logs (`ai`).
- Configurable line count (50, 100, 200, 500, 1000).
- Auto-refresh mode polls every 3 seconds.
- Terminal-style dark UI with syntax highlighting (ERROR=red, WARN=yellow, INFO=blue, DEBUG=gray).
- Auto-scrolls to bottom when new logs arrive.
- macOS-style window chrome (red/yellow/green dots).
