# API Layer

This document details the API client configuration, all service modules, their endpoints, request/response types, and integration patterns with the backend.

---

## 1. Shared API Client

### File: `src/shared/api/client.ts`

The shared client creates an Axios instance with automatic auth token attachment.

### Base URL Resolution

The API base URL is resolved using a two-tier strategy:

```
1. Runtime environment (Docker):  window.ENV.VITE_API_URL
2. Build-time environment:        import.meta.env.VITE_API_URL
3. Fallback:                      "/api/v1"
```

This allows the same built artifact to work in different environments by injecting `VITE_API_URL` at container startup via `env-config.sh`.

### Axios Instance Configuration

```typescript
export const api = axiosInstance.create({
  baseURL: getApiUrl(),
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nutri_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

- No response interceptor is configured.
- No retry logic or request queuing.
- No request timeout is set (defaults to Axios infinite).

---

## 2. Service Module Reference

### 2.1 Chat API

**File:** `src/features/chat/api/chatApi.ts`  
**Uses:** Shared Axios client (`api`) + raw `fetch` for streaming.

| Method                | HTTP             | Endpoint                        | Description                          |
| --------------------- | ---------------- | ------------------------------- | ------------------------------------ |
| `sendMessage`         | POST             | `/chat`                         | Send a message (non-streaming)       |
| `getSessions`         | GET              | `/chat/sessions`                | List all chat sessions               |
| `getSessionMessages`  | GET              | `/chat/{sessionId}/messages`    | Get messages for a session           |
| `deleteSession`       | DELETE           | `/chat/{sessionId}`             | Delete a chat session                |
| `updateSessionTitle`  | PATCH            | `/chat/{sessionId}`             | Rename a chat session                |
| `getUnreadCount`      | GET              | `/chat/unread`                  | Get unread session count and list    |
| `markSessionAsRead`   | POST             | `/chat/{sessionId}/read`        | Mark session as read                 |
| `sendStreamMessage`   | POST (fetch)     | `/chat/stream`                  | Send message with SSE response       |

#### Streaming Protocol

`sendStreamMessage` opens an SSE connection via raw `fetch` and processes events in a read loop:

**Request:**
```json
{ "message": "string", "thread_id": "string | null" }
```

**SSE Event Types:**

| Event Type           | Payload Fields                                     | Action                         |
| -------------------- | -------------------------------------------------- | ------------------------------ |
| `init`               | `thread_id`                                        | Set thread ID for new chats    |
| `chunk`              | `content`                                          | Append text to assistant msg   |
| `tool_start`         | `name`                                             | Show tool running indicator    |
| `tool_end`           | `name`, `result_snippet`, `meal_plan_draft`        | Update tool status to done     |
| `message_break`      | (none)                                             | Start a new assistant message  |
| `persisted_message`  | `message_id`, `draft_id`                           | Update local msg ID with UUID  |
| `error`              | `content`                                          | Show error in message          |

#### Types

```typescript
interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  has_unread?: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  created_at: string;
  meal_plan_draft?: MealPlanDraft | null;
  tools?: ToolState[];
  thinking_time?: number;
  started_at?: number;
}

interface MealPlanDraft {
  draft_id: string;
  total_days: number;
  summary_markdown?: string;
  saved?: boolean;
  meal_plan_id?: string;
}

interface ToolState {
  name: string;
  status: "running" | "done";
  result_snippet?: string;
}
```

---

### 2.2 Menu API

**File:** `src/features/meal-planner/api/menuApi.ts`  
**Uses:** Shared Axios client.

| Method                | HTTP   | Endpoint                    | Description                          |
| --------------------- | ------ | --------------------------- | ------------------------------------ |
| `getCurrentMenu`      | GET    | `/menus/current`            | Get the active meal plan             |
| `getMenus`            | GET    | `/menus`                    | List all meal plan summaries         |
| `getMenuById`         | GET    | `/menus/{menuId}`           | Get a specific meal plan             |
| `saveMenuFromChat`    | POST   | `/menus/save-from-chat`     | Save a chat-generated meal plan      |
| `updateCurrentMenu`   | PATCH  | `/menus/current`            | Update the active meal plan          |
| `updateMenuById`      | PATCH  | `/menus/{menuId}`           | Update a specific meal plan          |
| `deleteCurrentMenu`   | DELETE | `/menus/current`            | Delete the active meal plan          |
| `deleteMenuById`      | DELETE | `/menus/{menuId}`           | Delete a specific meal plan          |

#### Types

```typescript
interface RecipeDTO {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_calories?: number;
  dietary_tags?: string[];
  macros?: Record<string, number>;
  ingredients?: Array<{ name: string; quantity?: number }>;
}

interface MealDTO {
  id: string;
  eat_date: string;
  meal_type: string;
  recipe: RecipeDTO;
}

interface MealPlanResponse {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  meals: MealDTO[];
}

interface SaveMenuFromChatResponse {
  status: "saved" | "already_saved";
  meal_plan_id?: string;
  shopping_list?: Array<{ name: string; category?: string | null; quantity: string }>;
}
```

---

### 2.3 Grocery API

**File:** `src/features/meal-planner/api/groceryApi.ts`  
**Uses:** Shared Axios client.

| Method                     | HTTP   | Endpoint                                  | Description                          |
| -------------------------- | ------ | ----------------------------------------- | ------------------------------------ |
| `getCurrentGroceryList`    | GET    | `/grocery/current`                        | Get current shopping list            |
| `getGroceryByMenu`         | GET    | `/grocery/by-menu`                        | Get grocery items grouped by menu    |
| `deleteGroceryItem`        | DELETE | `/grocery/{id}`                           | Delete a single grocery item         |
| `deleteGroceryByMenu`      | DELETE | `/grocery/by-menu/{mealPlanId}`           | Delete all items for a meal plan     |
| `updateGroceryItem`        | PATCH  | `/grocery/{id}`                           | Update item name/quantity/status     |
| `getLotteBranches`         | GET    | `/grocery/stores/lotte`                   | List available Lotte Mart branches   |
| `getWinmartProvinces`      | GET    | `/grocery/stores/winmart/provinces`       | List WinMart provinces               |
| `getWinmartStores`         | GET    | `/grocery/stores/winmart?province=...`    | List WinMart stores in province      |
| `startShopping`            | POST   | `/grocery/shopping/start`                 | Start async shopping order           |
| `getShoppingOrder`         | GET    | `/grocery/shopping/order/{orderId}`       | Get shopping order status            |
| `getLatestShoppingOrder`   | GET    | `/grocery/shopping/latest/{mealPlanId}`   | Get latest order for a meal plan     |

#### Shopping Types

```typescript
type ShoppingStrategy = "lotte_priority" | "winmart_priority" | "cost_optimized";

interface ShoppingRequest {
  meal_plan_id: string;
  strategy: ShoppingStrategy;
  lotte_branch_id: string;
  winmart_store_code: string;
  winmart_store_group_code: string;
}

interface ShoppingResultDTO {
  items: ShoppingProductDTO[];
  not_found: string[];
  fridge_covered: FridgeCoveredDTO[];
  total_estimated_cost: number;
  strategy: string;
  summary: string;
}
```

---

### 2.4 Inventory API

**File:** `src/features/inventory/api/inventoryApi.ts`  
**Uses:** Shared Axios client.

| Method                  | HTTP   | Endpoint                              | Description                         |
| ----------------------- | ------ | ------------------------------------- | ----------------------------------- |
| `getCurrentInventory`   | GET    | `/inventory/current`                  | Get all fridge items                |
| `addInventoryItem`      | POST   | `/inventory`                          | Add a single fridge item            |
| `bulkAddInventory`      | POST   | `/inventory/bulk`                     | Bulk add multiple items             |
| `updateInventoryItem`   | PATCH  | `/inventory/{id}`                     | Update an item                      |
| `deleteInventoryItem`   | DELETE | `/inventory/{id}`                     | Delete an item                      |
| `renameCategory`        | PATCH  | `/inventory/categories/rename`        | Rename a category across all items  |

#### Types

```typescript
interface InventoryItemDTO {
  id: string;
  name: string;
  category: string;
  quantity: string;
  expiration_date: string | null;
}
```

---

### 2.5 Recipes API

**File:** `src/features/cooking/api/recipesApi.ts`  
**Uses:** Raw `fetch()` with manual auth headers.

| Function                       | HTTP   | Endpoint                                   | Description                        |
| ------------------------------ | ------ | ------------------------------------------ | ---------------------------------- |
| `searchRecipes`                | GET    | `/api/v1/recipes?q=&type=&max_time=`       | Search recipes with filters        |
| `webSearchRecipe`              | POST   | `/api/v1/recipes/web-search?query=`        | AI-powered web recipe search       |
| `getCollections`               | GET    | `/api/v1/collections`                      | List user collections              |
| `createCollection`             | POST   | `/api/v1/collections`                      | Create a new collection            |
| `deleteCollection`             | DELETE | `/api/v1/collections/{id}`                 | Delete a collection                |
| `getCollectionRecipes`         | GET    | `/api/v1/collections/{id}/recipes`         | Get recipes in a collection        |
| `addRecipeToCollection`        | POST   | `/api/v1/collections/{id}/recipes`         | Add recipe to collection           |
| `removeRecipeFromCollection`   | DELETE | `/api/v1/collections/{id}/recipes/{rid}`   | Remove recipe from collection      |
| `updateRecipe`                 | PATCH  | `/api/v1/recipes/{id}`                     | Update a recipe                    |
| `deleteRecipe`                 | DELETE | `/api/v1/recipes/{id}`                     | Delete a recipe                    |

Note: This module hardcodes the `/api/v1` prefix rather than using `getApiUrl()`.

---

### 2.6 Profile API

**File:** `src/features/profile/api/profileApi.ts`  
**Uses:** Shared Axios client.

| Method                | HTTP | Endpoint         | Description                          |
| --------------------- | ---- | ---------------- | ------------------------------------ |
| `submitOnboarding`    | POST | `/onboarding`    | Submit initial onboarding data       |
| `getOnboarding`       | GET  | `/onboarding`    | Get current onboarding data          |
| `updateOnboarding`    | PUT  | `/onboarding`    | Update onboarding data               |

Note: The payload type is `any`, reflecting that the onboarding data structure is flexible and defined by the QuizWizard component.

---

### 2.7 System API

**File:** `src/features/system/api/systemApi.ts`  
**Uses:** Raw `fetch()` with manual auth headers.

| Function     | HTTP | Endpoint                              | Description                  |
| ------------ | ---- | ------------------------------------- | ---------------------------- |
| `fetchLogs`  | GET  | `/api/v1/system/logs?type=&lines=`    | Fetch app or AI agent logs   |

The `type` parameter accepts `"app"` or `"ai"`. The `lines` parameter controls how many recent lines to return.

---

## 3. Additional Direct API Calls

Some components make direct `fetch()` calls to backend endpoints without going through a service module:

| Component     | Endpoint                                              | Purpose                              |
| ------------- | ----------------------------------------------------- | ------------------------------------ |
| `Navbar`      | `GET /system/dashboard-status`                        | Poll for notification counters       |
| `Navbar`      | `POST /chat/{id}/read`                                | Mark chat session as read            |
| `Navbar`      | `POST /grocery/shopping/notification/{id}/read`       | Mark shopping notification as read   |
| `Navbar`      | `GET /auth/me`                                        | Fetch user name for display          |
| `MainLayout`  | `GET /auth/me`                                        | Check onboarding status              |
| `DashboardPage`| `GET /auth/me`                                       | Fetch user name for greeting         |
| `ProfilePage` | `GET /auth/me`, `GET /profile/collections`            | Fetch user and collections           |

These inline calls bypass the service module pattern and contribute to code duplication. Consolidating them into the appropriate service modules would improve maintainability.
