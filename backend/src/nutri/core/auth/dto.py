from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class AuthResponse(BaseModel):
    """Response model for authentication."""

    access_token: str
    token_type: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class LanguagePreferenceUpdate(BaseModel):
    preferred_language: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: EmailStr
    full_name: str
    status: str
    preferred_language: str = "en"
    diet_mode: Optional[str] = None
    budget_level: Optional[str] = None


class UserDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: EmailStr
    full_name: str
    status: str
    preferred_language: str = "en"
    diet_mode: Optional[str] = None
    budget_level: Optional[str] = None
