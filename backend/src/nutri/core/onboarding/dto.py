# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from uuid import UUID

from pydantic import Field, BaseModel


class HealthProfileDto(BaseModel):
    """Health profile data transfer object."""

    allergies: list[str] | None = Field(default_factory=list)
    favorite_dishes: list[str] | None = Field(default_factory=list)
    conditions: list[str] | None = Field(default_factory=list)


class MemberDto(BaseModel):
    """Member data transfer object."""

    name: str | None = None
    relationship: str | None = None
    age: int | None = None
    gender: str | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    bmr: float | None = None
    tdee: float | None = None
    primary_goal: str | None = None
    activity_level: str | None = None
    health_profile: HealthProfileDto | None = Field(
        default_factory=HealthProfileDto
    )


class OnboardingRequest(BaseModel):
    """Onboarding request model."""

    # User-level fields (→ users table)
    diet_mode: str | None = None
    budget_level: str | None = None
    # Kitchen equipment
    equipment: list[str] | None = Field(default_factory=list)
    # Family members (→ family_members table)
    members: list[MemberDto] | None = Field(default_factory=list)


class MenuRecommendationResponse(BaseModel):
    """Menu recommendation response model."""

    message: str
    menu_preview: list[dict] | None = Field(default_factory=list)


class HealthProfileResponse(BaseModel):
    """Health profile response model."""

    allergies: list[str] = Field(default_factory=list)
    favorite_dishes: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)


class MemberResponse(BaseModel):
    """Member response model."""

    id: UUID
    name: str
    relationship: str | None = None
    age: int | None = None
    gender: str | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    bmr: float | None = None
    tdee: float | None = None
    primary_goal: str | None = None
    activity_level: str | None = None
    health_profile: HealthProfileResponse = Field(
        default_factory=HealthProfileResponse
    )


class OnboardingDataResponse(BaseModel):
    """Onboarding data response model."""

    diet_mode: str | None = None
    budget_level: str | None = None
    equipment: list[str] = Field(default_factory=list)
    members: list[MemberResponse] = Field(default_factory=list)
