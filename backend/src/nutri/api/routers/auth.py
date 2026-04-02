import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from nutri.api.dependencies import get_current_user
from nutri.core.auth.dto import AuthResponse, UserCreate, UserDTO
from nutri.core.auth.entities import GoogleToken
from nutri.core.auth.models import User
from nutri.core.db.session import get_db
from nutri.core.security.jwt import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

router = APIRouter()


@router.get("/me", response_model=UserDTO)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get the current user."""
    return current_user


@router.post("/register", response_model=AuthResponse)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create new user
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email, password_hash=hashed_password, full_name=user_in.full_name
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Generate Token
    access_token = create_access_token(subject=new_user.email)
    return AuthResponse(access_token=access_token, token_type="bearer")


@router.post("/login", response_model=AuthResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)
):
    """Login a user."""
    # Authenticate User
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()

    # Check if user exists
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not registered",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user exists and is active
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )

    # Check password
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate Token
    access_token = create_access_token(subject=user.email)
    return AuthResponse(access_token=access_token, token_type="bearer")


@router.post("/google", response_model=AuthResponse)
async def google_login(token_data: GoogleToken, db: AsyncSession = Depends(get_db)):
    """Login a user with Google."""
    # 1. Verify Token with Google
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_data.token}"},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Google Token")

        google_info = resp.json()

    email = google_info.get("email")
    name = google_info.get("name", "Google User")

    if not email:
        raise HTTPException(status_code=400, detail="Google account missing email")

    # 2. Check if user exists
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    if not user:
        # 3. Auto-register if new
        # Generate a random password (user should use Google to login, or reset pass later)
        import secrets

        random_pass = secrets.token_urlsafe(16)
        hashed_password = get_password_hash(random_pass)

        user = User(
            email=email, full_name=name, password_hash=hashed_password, status="active"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # 4. Issue App Token
    access_token = create_access_token(subject=user.email)
    return AuthResponse(access_token=access_token, token_type="bearer")
