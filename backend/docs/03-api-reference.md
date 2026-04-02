# API Reference

All endpoints are prefixed with `/api/v1`. Authentication is via Bearer JWT
token unless noted otherwise.

## 1. Auth (`/api/v1/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Create a new account (email + password) |
| POST | `/login` | No | Obtain JWT via email/password (OAuth2 form) |
| POST | `/google` | No | Obtain JWT via Google OAuth access token |
| GET | `/me` | Yes | Return current user profile |

### POST /register

**Request Body** (`UserCreate`):
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe"
}
```

**Response** (`AuthResponse`):
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

### POST /login

Standard OAuth2 password form (`username` = email, `password`).

### POST /google

**Request Body** (`GoogleToken`):
```json
{ "token": "<google_oauth_access_token>" }
```

The backend verifies the token with Google's userinfo endpoint. If the email
does not exist, a new user is auto-registered.

---

## 2. Onboarding (`/api/v1/onboarding`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | Yes | Retrieve onboarding data (diet mode, budget, members) |
| PUT | `` | Yes | Update onboarding data (full replacement) |
| POST | `` | Yes | Submit initial onboarding quiz |

Both PUT and POST trigger two background tasks:
1. `recompute_user_metabolism` -- recalculates BMR/TDEE for all members.
2. `enrich_user_health_profiles` -- runs `EnrichMetadataAgent` on conditions
   and allergies.

### PUT /onboarding

**Request Body** (`OnboardingRequest`):
```json
{
  "diet_mode": "balanced",
  "budget_level": "medium",
  "equipment": ["oven", "air_fryer"],
  "members": [
    {
      "name": "John",
      "relationship": "self",
      "age": 30,
      "gender": "male",
      "weight_kg": 75,
      "height_cm": 175,
      "primary_goal": "maintain",
      "activity_level": "moderate",
      "bmr": 1700,
      "tdee": 2635,
      "health_profile": {
        "allergies": ["Peanut"],
        "conditions": ["Diabetes"],
        "favorite_dishes": ["Pho"]
      }
    }
  ]
}
```

---

## 3. Chat (`/api/v1/chat`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/stream` | Yes | Send message, receive SSE stream |
| GET | `/sessions` | Yes | List all chat sessions |
| GET | `/{session_id}/messages` | Yes | Get messages for a session |
| PATCH | `/{session_id}` | Yes | Update session title |
| DELETE | `/{session_id}` | Yes | Delete a session |
| POST | `/{session_id}/read` | Yes | Mark session messages as read |
| GET | `/unread` | Yes | Get unread message count |

### POST /stream

**Request Body** (`ChatRequest`):
```json
{
  "message": "Len menu 3 ngay cho toi",
  "thread_id": "optional-uuid"
}
```

**Response**: `text/event-stream` with the following event types:

| Event Type | Payload | Description |
|---|---|---|
| `init` | `{"thread_id": "..."}` | First event, confirms thread ID |
| `chunk` | `{"content": "..."}` | Streamed text token |
| `tool_start` | `{"name": "create_meal_plan"}` | Agent started a tool call |
| `tool_end` | `{"name": "...", "meal_plan_draft": {...}}` | Tool completed |
| `token_usage` | `{"value": 1234}` | Cumulative token count |
| `persisted_message` | `{"message_id": "...", "draft_id": "..."}` | Message saved to DB |
| `retrying` | `{"reason": "...", "content": "..."}` | Stream retry due to error |
| `error` | `{"content": "..."}` | Fatal error |
| `done` | `{}` | Stream completed |

---

## 4. Menus (`/api/v1/menus`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/current` | Yes | Get the most recent meal plan |
| PATCH | `/current` | Yes | Update current meal plan |
| DELETE | `/current` | Yes | Delete current meal plan |
| GET | `` | Yes | List all meal plans (summary) |
| GET | `/{meal_plan_id}` | Yes | Get specific meal plan detail |
| PATCH | `/{meal_plan_id}` | Yes | Update specific meal plan |
| DELETE | `/{meal_plan_id}` | Yes | Delete specific meal plan |
| POST | `/save-from-chat` | Yes | Persist a draft from chat |

### POST /save-from-chat

**Request Body** (`SaveMenuFromChatRequest`):
```json
{
  "chat_message_id": "uuid-of-ai-message-with-draft"
}
```

This endpoint:
1. Locates the `meal_plan_draft` in the chat message's `tool_calls` JSONB.
2. Calls `persist_meal_plan_from_draft` to create Recipe, Ingredient, Meal,
   and MealPlan rows.
3. Triggers `generate_grocery_list_background` to create the shopping list.
4. Marks the draft as `saved` in the chat message metadata.
5. Returns the generated shopping list.

---

## 5. Grocery (`/api/v1/grocery`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/current` | Yes | Get grocery list for latest meal plan |
| PATCH | `/{item_id}` | Yes | Update a grocery item |
| DELETE | `/{item_id}` | Yes | Delete a grocery item |
| GET | `/by-menu` | Yes | Get grocery items grouped by meal plan |
| DELETE | `/by-menu/{meal_plan_id}` | Yes | Delete all items for a plan |
| GET | `/stores/lotte` | No | List Lotte Mart branches |
| GET | `/stores/winmart/provinces` | No | List WinMart provinces |
| GET | `/stores/winmart?province=...` | No | List WinMart stores by province |
| POST | `/shopping/start` | Yes | Start background shopping search |
| GET | `/shopping/order/{order_id}` | Yes | Poll shopping order status |
| GET | `/shopping/latest/{meal_plan_id}` | Yes | Get latest order for a plan |
| POST | `/shopping/notification/{order_id}/read` | Yes | Mark notification read |

### POST /shopping/start

**Request Body** (`ShoppingRequest`):
```json
{
  "meal_plan_id": "uuid",
  "strategy": "cost_optimized",
  "lotte_branch_id": "optional",
  "winmart_store_code": "optional",
  "winmart_store_group_code": "optional"
}
```

This endpoint runs `FridgeCheckAgent` to deduct inventory, then dispatches a
background task to search mart APIs.

---

## 6. Inventory (`/api/v1/inventory`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/current` | Yes | List all fridge/pantry items |
| POST | `` | Yes | Add a single inventory item |
| POST | `/bulk` | Yes | Bulk add inventory items |
| PATCH | `/{item_id}` | Yes | Update an inventory item |
| DELETE | `/{item_id}` | Yes | Delete an inventory item |
| PATCH | `/categories/rename` | Yes | Rename ingredient category globally |

---

## 7. Recipes (`/api/v1/recipes`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/search` | Yes | Web-search and extract recipes via Tavily + LLM |

---

## 8. Collections (`/api/v1/collections`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | Yes | List recipe collections |
| POST | `` | Yes | Create a collection |
| POST | `/{collection_id}/recipes` | Yes | Add recipe to collection |
| DELETE | `/{collection_id}/recipes/{recipe_id}` | Yes | Remove recipe |
| DELETE | `/{collection_id}` | Yes | Delete collection |

---

## 9. Profile (`/api/v1/profile`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | Yes | Get user profile summary |

---

## 10. System (`/api/v1/system`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Health check (returns `{"status": "ok"}`) |
| GET | `/dashboard-status` | Yes | Aggregated navbar counters |
| GET | `/logs?type=app&lines=100` | Yes | Tail application or AI logs |

### GET /dashboard-status

Returns a single-call response with:
- Unread chat count and session info
- Unpurchased grocery count
- Inventory item count
- Menu count
- Recent shopping order notifications
