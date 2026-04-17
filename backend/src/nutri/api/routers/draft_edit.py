# Copyright (c) 2026 Nutri. All rights reserved.
"""Router for draft menu editing (swap/add dishes via DishEditAgent)."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import Depends, APIRouter, HTTPException

from nutri.core.db.session import async_session_maker
from nutri.api.dependencies import get_current_user
from nutri.core.auth.models import User
from nutri.core.draft_edit.dto import (
    EditDishRequest,
    EditDishResponse,
    EditDishMealResponse,
)
from nutri.core.draft_edit.services import parse_number
from nutri.ai.agents.dish_edit_agent import DishEditAgent
from nutri.ai.workflows.meal_plan_workflow import (
    serialize_generated_meal,
    load_user_profile_context,
)


router = APIRouter()
logger = logging.getLogger("nutri.api.routers.draft_edit")


@router.post("/edit-dish", response_model=EditDishResponse)
async def edit_dish(
    payload: EditDishRequest,
    current_user: Annotated[User, Depends(get_current_user)],
) -> EditDishResponse:
    """Generate a single replacement or additional dish using the DishEditAgent.

    Args:
        payload: Request containing the action, meal type, custom prompt,
        current menu summary, and original dish name.
        current_user: Current user.

    Returns:
        Dictionary with status and meal.

    Raises:
        HTTPException: If user profile not found.
    """
    user_id = str(current_user.id)

    # Load user profile context
    async with async_session_maker() as db:
        user, profile_context = await load_user_profile_context(db, user_id)

    if not user or not profile_context:
        raise HTTPException(status_code=404, detail="User profile not found")

    agent = DishEditAgent()

    try:
        result = await agent.generate_dish(
            action=payload.action,
            meal_type=payload.meal_type,
            custom_prompt=payload.custom_prompt,
            profile_context=profile_context,
            current_menu_context=payload.current_menu_summary,
            original_dish_name=payload.original_dish_name,
        )
    except Exception as exc:
        logger.exception(
            "edit_dish failed | user=%s | action=%s | prompt=%s",
            user_id,
            payload.action,
            payload.custom_prompt[:100],
        )
        return EditDishResponse(
            status="error",
            action=payload.action,
            meal=None,
            error=f"AI generation failed: {str(exc).splitlines()[0][:200]}",
        )

    # Serialize the GeneratedMealData to dict matching the draft format
    serialized = serialize_generated_meal(result)

    meal_response = EditDishMealResponse(
        name=serialized["name"],
        description=serialized.get("description"),
        instructions=serialized.get("instructions") or [],
        per_person_breakdown=serialized.get("per_person_breakdown") or [],
        adjustment_tips=serialized.get("adjustment_tips") or [],
        why=serialized.get("why"),
        prep_time_minutes=serialized.get("prep_time_minutes"),
        cook_time_minutes=serialized.get("cook_time_minutes"),
        calories=parse_number(serialized.get("calories")),
        protein_grams=parse_number(serialized.get("protein_grams")),
        carbs_grams=parse_number(serialized.get("carbs_grams")),
        fat_grams=parse_number(serialized.get("fat_grams")),
        fiber_grams=parse_number(serialized.get("fiber_grams")),
        dietary_tags=serialized.get("dietary_tags") or [],
        ingredients=serialized.get("ingredients") or [],
        meal_type=serialized.get("meal_type") or payload.meal_type,
        servings=serialized.get("servings"),
    )

    logger.info(
        "edit_dish success | user=%s | action=%s | dish=%s | calories=%d",
        user_id,
        payload.action,
        meal_response.name,
        meal_response.calories,
    )

    return EditDishResponse(
        status="success",
        action=payload.action,
        meal=meal_response,
    )
