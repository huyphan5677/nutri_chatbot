import json
import logging
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from langchain_core.exceptions import OutputParserException
from nutri.ai.agents.assistant_agent import AssistantAgent
from nutri.ai.language import detect_user_language, normalize_language
from nutri.api.dependencies import get_current_user
from nutri.core.auth.models import User
from nutri.core.chat.dto import (
    ChatMessageResponse,
    ChatRequest,
    ChatSessionResponse,
    ChatSessionUpdateRequest,
    UnreadCountResponse,
    UnreadSessionInfo,
)
from nutri.core.chat.models import ChatMessage, ChatSession
from nutri.core.chat.services import extract_meal_plan_draft, is_meaningful_message
from nutri.core.db.session import async_session_maker, get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

router = APIRouter()
logger = logging.getLogger("nutri.api.routers.chat")


@router.get("/unread", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Get the number of unread messages for the current user."""
    result = await db.execute(
        select(ChatSession)
        .join(ChatMessage, ChatSession.id == ChatMessage.session_id)
        .where(ChatSession.user_id == current_user.id)
        .where(ChatMessage.message_type == "ai")
        .where(ChatMessage.is_read == False)
        .distinct()
    )
    unread_sessions = result.scalars().all()

    session_info_list = [
        UnreadSessionInfo(id=str(s.id), title=s.title or "New Chat")
        for s in unread_sessions
    ]

    return {"count": len(unread_sessions), "sessions": session_info_list}


# -------
# Session
# -------


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Get all chat sessions for the current user."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc(), ChatSession.created_at.desc())
    )
    sessions = result.scalars().all()

    response_sessions = []
    for session in sessions:
        # Check if any messages in this session are unread AI messages
        unread_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session.id)
            .where(ChatMessage.message_type == "ai")
            .where(ChatMessage.is_read == False)
        )
        has_unread = unread_result.scalars().first() is not None

        response_sessions.append(
            ChatSessionResponse(
                id=str(session.id),
                title=session.title or "New Chat",
                created_at=session.created_at,
                updated_at=session.updated_at,
                has_unread=has_unread,
            )
        )

    return response_sessions


@router.get("/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all messages for a specific chat session."""
    # Verify session belongs to user
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id, ChatSession.user_id == current_user.id
        )
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()

    response_messages = []
    for msg in messages:
        # Map message_type (human/ai) to role (user/assistant)
        role = "user" if msg.message_type == "human" else "assistant"
        if msg.message_type == "tool":
            role = "tool"

        response_messages.append(
            ChatMessageResponse(
                id=str(msg.id),
                role=role,
                content=msg.content or "",
                created_at=msg.created_at,
                meal_plan_draft=extract_meal_plan_draft(msg.tool_calls),
            )
        )

    return response_messages


@router.patch("/{session_id}", response_model=ChatSessionResponse)
async def update_chat_session(
    session_id: str,
    update_data: ChatSessionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a chat session."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id, ChatSession.user_id == current_user.id
        )
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    session.title = update_data.title
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)

    return ChatSessionResponse(
        id=str(session.id),
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        has_unread=False,
    )


@router.delete("/{session_id}", response_model=dict)
async def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat session."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id, ChatSession.user_id == current_user.id
        )
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    await db.delete(session)
    await db.commit()
    return {"status": "success", "message": "Chat session deleted"}


@router.post("/{session_id}/read")
async def mark_session_as_read(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a chat session as read."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id, ChatSession.user_id == current_user.id
        )
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Mark all unread AI messages in this session as read
    from sqlalchemy import update

    await db.execute(
        update(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .where(ChatMessage.message_type == "ai")
        .values(is_read=True)
    )
    await db.commit()
    return {"status": "success", "message": "Chat session marked as read"}


# --------
# Chatting
# --------


@router.post("/stream")
async def chat_stream_endpoint(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream chat with the AI assistant."""
    user_id = str(current_user.id)
    thread_id = request.thread_id or str(uuid.uuid4())
    result = await db.execute(select(ChatSession).where(ChatSession.id == thread_id))
    session = result.scalars().first()

    if not session:
        session = ChatSession(
            id=thread_id,
            user_id=current_user.id,
            title=request.message[:50] + "..."
            if len(request.message) > 50
            else request.message,
        )
        db.add(session)
    else:
        pass

    user_msg = ChatMessage(
        session_id=thread_id, message_type="human", content=request.message
    )
    db.add(user_msg)
    await db.commit()

    # Send thread_id in the first event headers so the client knows it
    import asyncio

    queue = asyncio.Queue()
    request_language = normalize_language(
        detect_user_language(request.message, default="en")
    )

    if not is_meaningful_message(request.message):
        async def empty_generator():
            yield f"data: {json.dumps({'type': 'init', 'thread_id': thread_id})}\n\n"
            if request_language == "vi":
                content = (
                    "Mình chưa hiểu rõ ý bạn lắm 🤔 Bạn có thể nói rõ hơn được không?\n\n"
                    "Mình có thể hỗ trợ về thực đơn, công thức nấu ăn và tư vấn dinh dưỡng.\n\n"
                    "Ví dụ bạn có thể hỏi: 'Lên thực đơn 2 ngày' hoặc 'Tối nay nên ăn gì?'"
                )
            else:
                content = (
                    "I didn't quite catch that 🤔. Could you please clarify your request?\n\n"
                    "I'm here to help with meal plans, recipes, and nutrition advice.\n\n"
                    "For example, you can ask: 'Create a 2-day meal plan' or 'What should I eat for dinner tonight?'"
                )
            yield f"data: {json.dumps({'type': 'chunk', 'content': content})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return StreamingResponse(empty_generator(), media_type="text/event-stream")

    async def bg_agent_task(q: asyncio.Queue, t_id: str, msg: str, uid: str):
        agent = AssistantAgent(user_id=uid, language=request_language)
        replies = [""]
        total_usage = 0
        all_tools = []
        current_meal_plan_draft = None

        def is_invalid_chat_history_error(err: Exception) -> bool:
            text = str(err)
            return (
                "do not have a corresponding ToolMessage" in text
                or "INVALID_CHAT_HISTORY" in text
            )

        def is_output_parser_error(err: Exception) -> bool:
            text = str(err)
            return isinstance(err, OutputParserException) or (
                "Failed to parse" in text
                or "OUTPUT_PARSING_FAILURE" in text
                or "validation errors for" in text
            )

        def compact_error_message(err: Exception) -> str:
            text = str(err).strip()
            if not text:
                return "Unknown parsing error"
            first_line = text.splitlines()[0].strip()
            return first_line[:240]

        async def persist_current_reply(update_session: bool = False):
            if not replies[-1].strip() and not all_tools:
                return None

            async with async_session_maker() as background_db:
                processed_tools = [
                    tc.copy() if hasattr(tc, "copy") else tc for tc in all_tools
                ]
                if current_meal_plan_draft:
                    processed_tools.append(
                        {
                            "type": "meal_plan_draft",
                            "data": current_meal_plan_draft,
                        }
                    )

                ai_msg = ChatMessage(
                    session_id=t_id,
                    message_type="ai",
                    content=replies[-1].strip(),
                    tool_calls=processed_tools,
                    token_usage=total_usage,
                    is_read=False,
                )
                background_db.add(ai_msg)
                await background_db.flush()

                if update_session:
                    res = await background_db.execute(
                        select(ChatSession).where(ChatSession.id == t_id)
                    )
                    s = res.scalars().first()
                    if s:
                        s.updated_at = datetime.now(timezone.utc)

                await background_db.commit()

                draft_id = None
                if isinstance(current_meal_plan_draft, dict):
                    maybe_draft_id = current_meal_plan_draft.get("draft_id")
                    if isinstance(maybe_draft_id, str):
                        draft_id = maybe_draft_id

                return {
                    "message_id": str(ai_msg.id),
                    "draft_id": draft_id,
                }

        async def run_stream(stream_thread_id: str):
            nonlocal total_usage, all_tools, current_meal_plan_draft

            async with asyncio.timeout(300):  # 5 minute max per request
                async for event in agent.chat_stream(msg, thread_id=stream_thread_id):
                    kind = event.get("type")
                    if kind == "chunk":
                        replies[-1] += event["content"]
                    elif kind == "token_usage":
                        total_usage += event.get("value", 0)
                        continue
                    elif kind == "tool_calls":
                        all_tools.extend(event.get("calls", []))
                        continue
                    elif kind == "tool_end":
                        if event.get("name") == "create_meal_plan":
                            draft = event.get("meal_plan_draft")
                            if isinstance(draft, dict):
                                current_meal_plan_draft = draft
                    elif kind == "message_break":
                        # Persist current segment before opening the next assistant message.
                        persisted = await persist_current_reply(update_session=False)
                        if persisted:
                            await q.put(
                                f"data: {json.dumps({'type': 'persisted_message', **persisted})}\n\n"
                            )

                        # Start a new reply buffer
                        replies.append("")
                        total_usage = 0
                        all_tools = []
                        current_meal_plan_draft = None

                    # Forward the event back to the client directly
                    await q.put(f"data: {json.dumps(event)}\n\n")

        try:
            max_attempts = 2
            stream_thread_id = t_id

            for attempt in range(1, max_attempts + 1):
                try:
                    await run_stream(stream_thread_id)
                    break
                except Exception as e:
                    is_history_retry = is_invalid_chat_history_error(e)
                    is_parse_retry = is_output_parser_error(e)

                    can_retry = (is_history_retry or is_parse_retry) and (
                        attempt < max_attempts
                    )
                    if not can_retry:
                        raise

                    reason = (
                        "conversation_state" if is_history_retry else "output_parse"
                    )
                    short_error = compact_error_message(e)

                    logger.warning(
                        "Stream failed, retrying once | t_id=%s | attempt=%d/%d | reason=%s | error=%s",
                        t_id,
                        attempt,
                        max_attempts,
                        reason,
                        short_error,
                    )

                    await q.put(
                        f"data: {json.dumps({'type': 'retrying', 'reason': reason, 'language': request_language, 'content': 'System error. Retrying...'})}\n\n"
                    )

                    # Reset partial state before retrying.
                    replies[:] = [""]
                    total_usage = 0
                    all_tools = []
                    current_meal_plan_draft = None
                    stream_thread_id = f"{t_id}-recovery-{uuid.uuid4()}"

            # Persist final segment before telling client stream is done.
            persisted = await persist_current_reply(update_session=True)
            if persisted:
                await q.put(
                    f"data: {json.dumps({'type': 'persisted_message', **persisted})}\n\n"
                )
            await q.put(f"data: {json.dumps({'type': 'done'})}\n\n")
        except asyncio.TimeoutError:
            logger.error("bg_agent_task timed out | t_id=%s | msg=%r", t_id, msg[:200])
            await q.put(
                f"data: {json.dumps({'type': 'error', 'language': request_language, 'content': 'Request timed out after 3 minutes'})}\n\n"
            )
        except Exception as e:
            logger.exception("bg_agent_task error | t_id=%s | error=%s", t_id, str(e))
            await q.put(
                f"data: {json.dumps({'type': 'error', 'language': request_language, 'content': f'Error: {compact_error_message(e)}'})}\n\n"
            )
        finally:
            await q.put(None)  # Sentinel to stop generator

    # Create the background task for the agent
    asyncio.create_task(bg_agent_task(queue, thread_id, request.message, user_id))

    async def event_generator():
        # First event to send thread_id, in case this is a new chat
        yield f"data: {json.dumps({'type': 'init', 'thread_id': thread_id})}\n\n"

        while True:
            item = await queue.get()
            if item is None:
                break
            yield item

    return StreamingResponse(event_generator(), media_type="text/event-stream")
