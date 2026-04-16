# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from typing import TYPE_CHECKING, Annotated

import jwt
from fastapi import Depends, HTTPException, status
from pydantic import ValidationError
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.future import select

from nutri.core.db.session import get_db
from nutri.core.auth.models import User
from nutri.core.security.jwt import ALGORITHM
from nutri.common.config.settings import settings


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: str = Depends(oauth2_scheme),
) -> User:
    """Get the current user from the token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except (jwt.exceptions.PyJWTError, ValidationError):
        raise credentials_exception

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user


async def get_optional_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: str | None = Depends(
        OAuth2PasswordBearer(
            tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False
        )
    ),
) -> User | None:
    """Get the optional user from the token."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        result = await db.execute(select(User).where(User.email == email))
        return result.scalars().first()
    except (jwt.exceptions.PyJWTError, ValidationError):
        return None
