import ast
import json
import logging
import uuid
from datetime import datetime
from typing import Any, Optional
from zoneinfo import ZoneInfo

from langchain_core.messages import SystemMessage
from langgraph.prebuilt import create_react_agent
from nutri.ai.checkpoint import get_postgres_checkpointer
from nutri.ai.language import detect_user_language, normalize_language
from nutri.ai.llm_client import get_llm
from nutri.ai.tools.health_tools import (
    get_health_goals,
)
from nutri.ai.tools.knowledge_tools import (
    enrich_attribute_metadata,
    get_diet_reference,
    web_search_info,
)
from nutri.ai.tools.nutrition_tools import (
    calculate_bmr,
    predict_glucose_spike,
)
from nutri.ai.tools.plan_tools import create_meal_plan
from nutri.ai.tools.profile_tools import get_user_profile, update_user_profile

logger = logging.getLogger("nutri.ai.agents.assistant")


def _extract_meal_plan_draft(tool_output: Any) -> Optional[dict]:
    parsed_output: Any = tool_output
    if hasattr(parsed_output, "content"):
        parsed_output = getattr(parsed_output, "content")

    if isinstance(parsed_output, str):
        text = parsed_output.strip()
        if not text:
            return None
        try:
            parsed_output = json.loads(text)
        except Exception:
            try:
                parsed_output = ast.literal_eval(text)
            except Exception:
                return None

    if not isinstance(parsed_output, dict):
        return None

    draft = parsed_output.get("meal_plan_draft")
    if isinstance(draft, dict):
        return draft

    # Fallback: support direct draft payload shape if returned without wrapper.
    if {"draft_id", "total_days"}.issubset(parsed_output.keys()):
        return parsed_output

    return None


class AssistantAgent:
    """
    The main conversational orchestrator for the Nutri App.
    Uses LangGraph's prebuilt ReAct agent to decide which tools to call based on user input.
    """

    def __init__(self, user_id: str, timezone: str = "UTC", language: str = "en"):
        self.user_id = user_id
        self.timezone = timezone
        self.language = language
        # Lower temperature improves deterministic tool selection for action-oriented requests.
        self.llm = get_llm(temperature=0.2)
        logger.info(
            "AssistantAgent init | user_id=%s | language=%s | timezone=%s",
            user_id,
            language,
            timezone,
        )

        # Define available tools
        self.tools = [
            get_user_profile,
            update_user_profile,
            predict_glucose_spike,
            calculate_bmr,
            create_meal_plan,
            get_health_goals,
            get_diet_reference,
            enrich_attribute_metadata,
            web_search_info,
        ]

    async def _get_app(self, thread_id: str):
        """Lazy load the agent with the postgres checkpointer."""
        checkpointer = await get_postgres_checkpointer()
        return create_react_agent(
            self.llm,
            tools=self.tools,
            checkpointer=checkpointer,
            prompt=self.get_system_message(),
        )

    def get_system_message(self) -> SystemMessage:
        language_code = normalize_language(self.language, default="en")
        prompt = f"""
        # IDENTITY
        You are Corin, a professional, empathetic nutrition assistant.
        You NEVER guess health recommendations. You ALWAYS use your tools to analyze data.
        You MUST respond in the user's language.
        User timezone: {self.timezone} and now: {datetime.now(ZoneInfo(self.timezone))}.
        Detected user language code: {language_code}.
        If a tool returns English text, rewrite and present it in language code {language_code}.
        If language detection confidence is low, default to English.

        # CORE BEHAVIOR
        - **ACT IMMEDIATELY** on clear user requests. Never respond with confirmations like
        "Sure! Let me do that for you" before calling a tool. Call the tool first, then present results.
        - If a required tool call fails or returns insufficient data, ask the user ONLY for the
        specific missing fields needed. Do not ask for information you can retrieve via tools.

        # NON-NEGOTIABLE EXECUTION CONTRACT
        - If the user asks for an action that maps to tools, you MUST execute tools in the SAME turn.
        - Do NOT stop at intent acknowledgment (e.g., "I will check your profile...").
        - A turn is considered incomplete if you only promise an action but do not call tools.
        - For action requests, natural-language content before first tool call must be minimal or empty.
        - Forbidden behavior: confirmation-only reply without any tool call for actionable requests.

        # RULES

        ## BMR Calculation
        - Step 1: After receiving profile data, check for required fields:
        weight, height, age, gender, activity_level.
        - Step 2a: All fields present → call `calculate_bmr` immediately.
        - Step 2b: Some fields missing → ask user ONLY for the specific missing fields,
        then call `calculate_bmr` once received.
        - Step 3: Present BMR results in this exact structure (in user's language):
            **Your BMR Results**

            **Input used:** [gender] | [age]y | [weight]kg | [height]cm

            **BMR: [value] kcal/day**
            _(calories your body needs at complete rest)_

            **TDEE by activity level:**
            | Level | Multiplier | kcal/day |
            |-------|-----------|----------|
            | Sedentary      | x1.2   | [value] |
            | Lightly active | x1.375 | [value] |
            | Moderately active | x1.55 | [value] |
            | Very active    | x1.725 | [value] |
            | Extra active   | x1.9   | [value] |
            → **Your level ([activity_level]): [TDEE] kcal/day**

            **Goals:**
            • Cut: [TDEE - 400] kcal | Maintain: [TDEE] kcal | Bulk: [TDEE + 400] kcal

        ## Meal Suggestions
        - Call `get_user_profile` first if user conditions/preferences are unknown.
        - Use `predict_glucose_spike` when user asks about a food's health impact.

        ## Meal Plans (menu / thực đơn / lên menu)
        - DO NOT CALL `get_user_profile`.
        - Step 1: Call `create_meal_plan`.
        • Single meal request ("tối nay", "bữa trưa") → total_days=1, custom_prompt specifying meal type
        • Multi-day request → total_days = requested number
        • Always pass household member conditions into custom_prompt

        - Step 2: NEVER ask for confirmation before acting. NEVER say "Let me prepare that" before calling.
        - Step 3: Completion criteria for meal-plan turn:
            a) `create_meal_plan` has been called
            b) final response includes clear outcome and next action (review + Save menu + View details)

        ## Tool-Chaining Reliability Rule
        - For multi-step tasks (like meal plans), continue chaining tools until completion criteria are met.
        - Do not terminate early after only the first prerequisite tool.
        - If a tool returns partial data, continue with best valid next tool call instead of stopping.

        ## Behavior Examples
        - User: "lên menu 2 ngày cho tôi"
            Correct behavior in SAME turn: call `create_meal_plan(total_days=2, custom_prompt=...)` -> present result.
            Incorrect behavior: only replying "I will check your profile" and stopping.

        ## Out-of-Domain Questions
        - If the question is outside nutrition/health, first state that you are a nutrition and wellness assistant.
        - State this in language code {language_code}.
        - Then use `web_search_info` to find and provide the answer.
        - When `web_search_info` returns sources, include 1-3 source URLs in your final reply.
        - Synthesize the result briefly; do not dump raw snippets unless user asks for raw output.
        - If web search has no usable result, clearly say so and suggest a refined query.

        # DECISION FLOW
        User request received
        → Is it actionable with available tools? YES → Call tool immediately, present results.
        → Missing required data that tools can't provide? → Ask ONLY for those specific fields.
        → Out of domain? → Disclaim, then search.
        """
        return SystemMessage(content=prompt)

    async def chat_stream(self, user_message: str, thread_id: str = None):
        """Process a user message and yield the assistant's reply as a stream of chunks."""
        if not thread_id:
            thread_id = str(uuid.uuid4())

        logger.info(
            "chat_stream() start | user_id=%s | thread_id=%s | message_preview=%r",
            self.user_id,
            thread_id,
            user_message[:120],
        )

        detected_language = normalize_language(
            detect_user_language(user_message, default=self.language)
        )
        self.language = detected_language
        config = {
            "configurable": {
                "thread_id": thread_id,
                "user_id": self.user_id,
                "language": detected_language,
            }
        }

        app_with_prompt = await self._get_app(thread_id)

        inputs = {"messages": [("user", user_message)]}
        total_chunks = 0
        active_tools = 0

        async for event in app_with_prompt.astream_events(
            inputs, config=config, version="v2"
        ):
            kind = event["event"]
            if kind == "on_chat_model_stream":
                if active_tools > 0:
                    continue

                # The model is yielding a chunk
                chunk = event["data"]["chunk"]

                # Check if this chunk is part of a tool call setup by the orchestrator
                is_tool_call = False
                if hasattr(chunk, "tool_calls") and chunk.tool_calls:
                    is_tool_call = True
                if hasattr(chunk, "tool_call_chunks") and chunk.tool_call_chunks:
                    is_tool_call = True

                if not is_tool_call:
                    content = chunk.content
                    if isinstance(content, str) and content:
                        total_chunks += 1
                        yield {"type": "chunk", "content": content}
                    elif isinstance(content, list):
                        for block in content:
                            if isinstance(block, dict) and block.get("type") == "text":
                                total_chunks += 1
                                yield {
                                    "type": "chunk",
                                    "content": block.get("text", ""),
                                }
                            elif isinstance(block, str):
                                total_chunks += 1
                                yield {"type": "chunk", "content": block}
            elif kind == "on_tool_start":
                if total_chunks > 0 and active_tools == 0:
                    yield {"type": "message_break"}
                    total_chunks = 0

                active_tools += 1
                yield {"type": "tool_start", "name": event.get("name", "unknown")}
                logger.debug(
                    "tool_call | user_id=%s | thread_id=%s | tool=%s | input=%r",
                    self.user_id,
                    thread_id,
                    event.get("name", "unknown"),
                    str(event["data"].get("input", ""))[:200],
                )
            elif kind == "on_tool_end":
                if active_tools > 0:
                    active_tools -= 1

                if active_tools == 0:
                    output = event.get("data", {}).get("output")
                    snippet = ""
                    if output:
                        try:
                            raw_out = getattr(output, "content", output)
                            if isinstance(raw_out, dict):
                                out_str = json.dumps(raw_out, ensure_ascii=False)
                            else:
                                out_str = str(raw_out)
                            out_str = " ".join(out_str.split())
                            snippet = (
                                out_str[:200] + "..." if len(out_str) > 200 else out_str
                            )
                        except Exception:
                            pass

                    meal_plan_draft = None
                    if event.get("name") == "create_meal_plan":
                        meal_plan_draft = _extract_meal_plan_draft(output)
                        logger.debug(
                            "create_meal_plan output parsed | user_id=%s | thread_id=%s | output_type=%s | draft_found=%s",
                            self.user_id,
                            thread_id,
                            type(output).__name__,
                            bool(meal_plan_draft),
                        )

                    yield {
                        "type": "tool_end",
                        "name": event.get("name", "unknown"),
                        "meal_plan_draft": meal_plan_draft,
                        "result_snippet": snippet,
                    }

                logger.debug(
                    "tool_done | user_id=%s | thread_id=%s | tool=%s",
                    self.user_id,
                    thread_id,
                    event.get("name", "unknown"),
                )
            elif kind == "on_custom_event":
                yield {
                    "type": "on_custom_event",
                    "name": event.get("name", "unknown"),
                    "data": event.get("data", {})
                }
            elif kind == "on_chat_model_end":
                # Extract usage and tool calls from the final chat model outputs
                output = event.get("data", {}).get("output")
                if output and hasattr(output, "usage_metadata"):
                    usage = output.usage_metadata
                    if usage and "total_tokens" in usage:
                        yield {"type": "token_usage", "value": usage["total_tokens"]}

                if output and hasattr(output, "tool_calls"):
                    t_calls = output.tool_calls
                    if t_calls and isinstance(t_calls, list) and len(t_calls) > 0:
                        yield {"type": "tool_calls", "calls": t_calls}

        logger.info(
            "chat_stream() done | user_id=%s | thread_id=%s | chunks=%d",
            self.user_id,
            thread_id,
            total_chunks,
        )
