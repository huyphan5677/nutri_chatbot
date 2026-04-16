# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from uuid import UUID

from pydantic import EmailStr, BaseModel, ConfigDict


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


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str


class ThemePreferenceUpdate(BaseModel):
    preferred_theme: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: EmailStr
    full_name: str
    status: str
    preferred_language: str = "en"
    preferred_theme: str = "light"
    diet_mode: str | None = None
    budget_level: str | None = None


class UserDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: EmailStr
    full_name: str
    status: str
    preferred_language: str = "en"
    preferred_theme: str = "light"
    diet_mode: str | None = None
    budget_level: str | None = None
