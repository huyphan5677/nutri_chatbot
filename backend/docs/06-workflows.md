# Workflows

This document describes the end-to-end business workflows in the Nutri
backend: how data flows through agents, services, and the database for each
major feature.

## 1. User Registration and Authentication

```mermaid
sequenceDiagram
    participant C as Client
    participant R as auth router
    participant DB as PostgreSQL
    participant JWT as jwt.py

    C->>R: POST /auth/register {email, password, name}
    R->>R: Validate email uniqueness
    R->>JWT: get_password_hash(password)
    R->>DB: INSERT INTO users
    R->>JWT: create_access_token(email)
    R-->>C: {access_token, token_type}
```

## 2. Onboarding Flow

The onboarding flow persists user dietary preferences and household member
profiles, then triggers two background enrichment tasks.

```mermaid
sequenceDiagram
    participant C as Client
    participant R as onboarding router
    participant DB as PostgreSQL
    participant BG1 as recompute_metabolism
    participant BG2 as enrich_health_profiles
    participant EMA as EnrichMetadataAgent
    participant LLM as LLM Provider

    C->>R: PUT /onboarding {diet_mode, members, equipment}
    R->>R: validate_required_member()
    R->>DB: UPDATE users (diet_mode, budget_level)
    R->>DB: DELETE existing family_members
    R->>DB: INSERT new family_members
    R->>DB: COMMIT

    par Background Tasks
        R-->>BG1: asyncio.create_task()
        BG1->>DB: SELECT family_members
        BG1->>BG1: calculate_member_bmr_tdee() per member
        BG1->>DB: UPDATE bmr, tdee

        R-->>BG2: asyncio.create_task()
        BG2->>DB: SELECT family_members
        loop For each member with conditions/allergies
            BG2->>EMA: enrich_member_profile(conditions, allergies)
            EMA->>LLM: Structured output per condition
            LLM-->>EMA: AttributeMetadata
            EMA-->>BG2: EnrichedMemberProfile
        end
        BG2->>DB: UPDATE health_profile.enriched_metadata
    end

    R-->>C: OnboardingDataResponse
```

### BMR/TDEE Calculation

Uses the Mifflin-St Jeor equation:
- Male: `10 * weight + 6.25 * height - 5 * age + 5`
- Female: `10 * weight + 6.25 * height - 5 * age - 161`

TDEE = BMR * activity multiplier:

| Level | Multiplier |
|---|---|
| sedentary | 1.2 |
| light | 1.375 |
| moderate | 1.55 |
| active | 1.725 |
| very_active | 1.9 |

## 3. Chat Streaming Flow

The chat flow is the central interaction pathway. It uses Server-Sent Events
(SSE) to stream agent responses in real time.

```mermaid
sequenceDiagram
    participant C as Client
    participant R as chat router
    participant DB as PostgreSQL
    participant Q as asyncio.Queue
    participant AA as AssistantAgent
    participant LG as LangGraph ReAct
    participant TOOLS as Tool Layer

    C->>R: POST /chat/stream {message, thread_id}
    R->>DB: Create/retrieve ChatSession
    R->>DB: INSERT ChatMessage (human)
    R->>R: is_meaningful_message()?

    alt Non-meaningful message
        R-->>C: SSE: init + fallback message + done
    else Meaningful message
        R->>Q: Create asyncio.Queue
        R-->>C: SSE: init {thread_id}

        par Background Agent Task
            R->>AA: bg_agent_task()
            AA->>LG: astream_events(message, config)

            loop ReAct Loop
                LG->>LG: Reason about next action
                alt Tool needed
                    LG->>TOOLS: Execute tool
                    LG-->>Q: tool_start event
                    TOOLS-->>LG: Tool result
                    LG-->>Q: tool_end event
                else Generate text
                    LG-->>Q: chunk events
                end
            end

            AA->>DB: persist_current_reply()
            AA-->>Q: persisted_message event
            AA-->>Q: done event
        end

        loop Stream Events
            C<<--R: SSE events from Queue
        end
    end
```

### Non-Meaningful Message Detection

The system filters out trivial inputs (greetings, single characters, emojis)
and returns a predefined helpful response instead of invoking the agent.
Language-specific fallbacks are provided for Vietnamese and English.

### Stream Error Recovery

If the agent stream fails due to invalid chat history or output parsing errors,
the system:
1. Sends a `retrying` event to the client.
2. Resets all partial state.
3. Creates a recovery thread ID (`{original_id}-recovery-{uuid}`).
4. Retries the stream once.

## 4. Meal Plan Generation Flow

This is the most complex workflow, spanning multiple agents and the
draft-then-persist pattern.

### 4.1 Draft Generation

```mermaid
sequenceDiagram
    participant AA as AssistantAgent
    participant PT as create_meal_plan tool
    participant WF as meal_plan_workflow
    participant MPA as MealPlanAgent
    participant LLM as LLM Provider
    participant DB as PostgreSQL

    AA->>PT: create_meal_plan(total_days, custom_prompt)
    PT->>DB: Load FamilyMember data
    PT->>PT: Build metabolic context string
    PT->>WF: generate_meal_plan_draft(user_id, days, prompt)
    WF->>DB: Load User + FamilyMembers (profile context)

    loop Day 1 to N
        WF->>MPA: agenerate_for_day(profile, day, total, prev_context)
        MPA->>LLM: Structured output request (DayMealsData)
        LLM-->>MPA: DayMealsData

        alt Parse failure
            MPA->>LLM: Retry with fallback prompt (up to 5x)
        end

        MPA-->>WF: DayMealsData
        WF->>WF: Serialize meals, build daily summary
        WF->>WF: Append to previous_days_context
    end

    WF-->>PT: Draft payload (not persisted)
    PT-->>AA: {summary, meal_plan_draft}
    AA-->>Client: Stream draft via SSE
```

**Draft Payload Structure:**

```json
{
  "draft_id": "uuid",
  "total_days": 3,
  "custom_prompt": "...",
  "name": "Menu Apr 02",
  "start_date": "2026-04-02",
  "end_date": "2026-04-04",
  "ai_context_summary": {"profile": "..."},
  "summary_markdown": "**Day 1**\n- ...",
  "days": [
    {
      "day_number": 1,
      "eat_date": "2026-04-02",
      "day_header": "Day 1 - 2 people - Targets: ...",
      "meals": [
        {
          "name": "Grilled Chicken Salad",
          "meal_type": "lunch",
          "calories": 450,
          "protein_grams": 35,
          "carbs_grams": 20,
          "fat_grams": 15,
          "ingredients": ["200g chicken breast", "100g mixed greens"],
          "instructions": ["Step 1...", "Step 2..."],
          "per_person_breakdown": ["Person 1: 450 kcal"],
          "adjustment_tips": ["Add avocado for healthy fats"],
          "why": "High protein, low carb meal suitable for weight management"
        }
      ]
    }
  ],
  "saved": false
}
```

### 4.2 Draft Persistence

```mermaid
sequenceDiagram
    participant C as Client
    participant R as menus router
    participant WF as meal_plan_workflow
    participant GW as grocery_workflow
    participant GLA as GroceryListAgent
    participant DB as PostgreSQL

    C->>R: POST /menus/save-from-chat {chat_message_id}
    R->>DB: Find ChatMessage with meal_plan_draft
    R->>WF: persist_meal_plan_from_draft(draft)

    WF->>DB: INSERT MealPlan
    loop For each day and meal
        WF->>DB: INSERT Recipe
        loop For each ingredient
            WF->>DB: Find or INSERT Ingredient
            WF->>DB: INSERT RecipeIngredient
        end
        WF->>DB: INSERT Meal
    end
    WF->>DB: UPDATE MealPlan status = "completed"
    WF->>DB: COMMIT

    WF->>GW: generate_grocery_list_background(meal_plan_id)
    GW->>DB: Load MealPlan with meals, recipes, ingredients
    GW->>GW: Extract raw ingredient lines
    GW->>GLA: agenerate(raw_ingredient_context)
    GLA-->>GW: GroceryListData
    GW->>DB: INSERT GroceryItems
    GW->>DB: COMMIT

    R->>DB: Mark draft as saved in ChatMessage.tool_calls
    R->>DB: INSERT shopping list ChatMessage
    R-->>C: SaveMenuFromChatResponse
```

### 4.3 Ingredient Parsing

The workflow includes robust ingredient parsing (`_parse_ingredient_entry`)
that handles multiple formats:

| Input Format | Example | Parsed Name | Parsed Grams |
|---|---|---|---|
| Leading weight | "200g chicken breast" | "chicken breast" | 200 |
| Trailing weight | "Chicken breast: 200g" | "Chicken breast" | 200 |
| Dict-like string | "{'name': 'Rice', 'grams': 300}" | "Rice" | 300 |
| Plain text | "Salt and pepper" | "Salt and pepper" | null |
| Kilogram unit | "1.5 kg rice" | "rice" | 1500 |

## 5. Grocery Shopping Flow

The shopping flow integrates the FridgeCheckAgent with mart API searches.

```mermaid
sequenceDiagram
    participant C as Client
    participant R as grocery router
    participant FCA as FridgeCheckAgent
    participant BG as shopping_bg
    participant MART as Mart APIs
    participant PV as ProductValidator
    participant DB as PostgreSQL

    C->>R: POST /grocery/shopping/start {meal_plan_id, strategy}
    R->>DB: Load unpurchased GroceryItems
    R->>DB: Load UserInventory (fridge)
    R->>FCA: acheck(grocery_items, inventory_items)
    FCA-->>R: FridgeCheckResult (buy/skip per item)

    alt All covered by fridge
        R->>DB: INSERT ShoppingOrder (completed)
        R-->>C: {status: completed}
    else Items to buy
        R->>DB: INSERT ShoppingOrder (processing)
        R-->>C: {order_id, status: processing}

        par Background Task
            R->>BG: process_shopping_background()
            loop For each item to buy
                BG->>MART: Search Lotte / WinMart API
                MART-->>BG: Product results
                BG->>PV: Validate product relevance (LLM)
                PV-->>BG: Validated products
            end
            BG->>DB: UPDATE ShoppingOrder (result_data)
        end
    end

    C->>R: GET /grocery/shopping/order/{id} (polling)
    R->>DB: SELECT ShoppingOrder
    R-->>C: {status, result_data}
```

### Shopping Strategies

| Strategy | Behavior |
|---|---|
| `lotte_priority` | Search Lotte Mart first, fall back to WinMart |
| `winmart_priority` | Search WinMart first, fall back to Lotte Mart |
| `cost_optimized` | Search both, select cheapest option per item |

## 6. Recipe Search Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant R as recipes router
    participant RT as recipe_tools
    participant TAV as Tavily API
    participant LLM as LLM Provider

    C->>R: GET /recipes/search?query=pho
    R->>RT: perform_recipe_web_search("pho")
    RT->>TAV: search("pho recipe with ingredients and instructions")
    TAV-->>RT: Top 3 results with raw_content
    RT->>LLM: Extract structured recipes (RecipeList schema)
    LLM-->>RT: List of extracted recipes
    RT-->>R: Recipe dicts with source_url
    R-->>C: RecipeSearchResult[]
```

## 7. Background Task Summary

| Task | Trigger | Blocking | Agent Used |
|---|---|---|---|
| Recompute metabolism | Onboarding submit/update | No | None (pure calculation) |
| Enrich health profiles | Onboarding submit/update | No | EnrichMetadataAgent |
| Generate grocery list | Meal plan persistence | Configurable | GroceryListGeneratorAgent |
| Process shopping order | Shopping start | No | FridgeCheckAgent + Mart APIs |

All background tasks use `asyncio.create_task()` except the shopping order
which uses FastAPI's `BackgroundTasks` dependency.
