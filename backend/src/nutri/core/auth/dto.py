# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from uuid import UUID

from pydantic import EmailStr, BaseModel, ConfigDict


class AuthResponse(BaseModel):
    """Response model for authentication."""

    access_token: str
    token_type: str


class UserCreate(BaseModel):
    """User creation request model."""

    email: EmailStr
    password: str
    full_name: str


class UserLogin(BaseModel):
    """User login request model."""

    email: EmailStr
    password: str


class LanguagePreferenceUpdate(BaseModel):
    """Language preference update request model."""

    preferred_language: str


class PasswordUpdate(BaseModel):
    """Password update request model."""

    current_password: str
    new_password: str


class ThemePreferenceUpdate(BaseModel):
    """Theme preference update request model."""

    preferred_theme: str


class UserResponse(BaseModel):
    """User response model."""

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
    """User data transfer object."""

    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: EmailStr
    full_name: str
    status: str
    preferred_language: str = "en"
    preferred_theme: str = "light"
    diet_mode: str | None = None
    budget_level: str | None = None


AUTH_MESSAGES = {
    "email_already_registered": {
        "en": "Email already registered",
        "vi": "Email đã được đăng ký",
    },
    "not_registered": {
        "en": "Not registered. Please sign up before login.",
        "vi": "Tài khoản chưa được đăng ký. Vui lòng đăng kí trước khi đăng nhập.",
    },
    "account_not_active": {
        "en": "Account is not active",
        "vi": "Tài khoản hiện không hoạt động",
    },
    "incorrect_credentials": {
        "en": "Incorrect email or password",
        "vi": "Email hoặc mật khẩu không đúng",
    },
    "invalid_google_token": {
        "en": "Invalid Google Token",
        "vi": "Token Google không hợp lệ",
    },
    "google_missing_email": {
        "en": "Google account missing email",
        "vi": "Tài khoản Google không có email",
    },
}
