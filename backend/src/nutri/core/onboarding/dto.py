from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class HealthProfileDto(BaseModel):
    allergies: Optional[List[str]] = Field(default_factory=list)
    favorite_dishes: Optional[List[str]] = Field(default_factory=list)
    conditions: Optional[List[str]] = Field(default_factory=list)


class MemberDto(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    bmr: Optional[float] = None
    tdee: Optional[float] = None
    primary_goal: Optional[str] = None
    activity_level: Optional[str] = None
    health_profile: Optional[HealthProfileDto] = Field(default_factory=HealthProfileDto)


class OnboardingRequest(BaseModel):
    # User-level fields (→ users table)
    diet_mode: Optional[str] = None
    budget_level: Optional[str] = None
    # Kitchen equipment
    equipment: Optional[List[str]] = Field(default_factory=list)
    # Family members (→ family_members table)
    members: Optional[List[MemberDto]] = Field(default_factory=list)


class MenuRecommendationResponse(BaseModel):
    message: str
    menu_preview: Optional[List[dict]] = Field(default_factory=list)


class HealthProfileResponse(BaseModel):
    allergies: List[str] = Field(default_factory=list)
    favorite_dishes: List[str] = Field(default_factory=list)
    conditions: List[str] = Field(default_factory=list)


class MemberResponse(BaseModel):
    id: UUID
    name: str
    relationship: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    bmr: Optional[float] = None
    tdee: Optional[float] = None
    primary_goal: Optional[str] = None
    activity_level: Optional[str] = None
    health_profile: HealthProfileResponse = Field(default_factory=HealthProfileResponse)


class OnboardingDataResponse(BaseModel):
    diet_mode: Optional[str] = None
    budget_level: Optional[str] = None
    equipment: List[str] = Field(default_factory=list)
    members: List[MemberResponse] = Field(default_factory=list)
