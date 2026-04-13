import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from nutri.api.dependencies import get_current_user
from nutri.common.i18n import get_request_language, normalize_language
from nutri.core.auth.dto import (
    AuthResponse,
    LanguagePreferenceUpdate,
    ThemePreferenceUpdate,
    UserCreate,
    UserDTO,
)
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


def auth_message(key: str, language: str) -> str:
    translations = AUTH_MESSAGES.get(key, {})
    return translations.get(language) or translations.get("en") or key


async def persist_user_language(
    user: User, language: str, db: AsyncSession, commit: bool = True
):
    normalized = normalize_language(language, default="en")
    if user.preferred_language == normalized:
        return

    user.preferred_language = normalized
    if commit:
        await db.commit()


@router.get("/me", response_model=UserDTO)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get the current user."""
    return current_user


@router.patch("/preferences/language", response_model=UserDTO)
async def update_language_preference(
    payload: LanguagePreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await persist_user_language(current_user, payload.preferred_language, db)
    await db.refresh(current_user)
    return current_user


@router.patch("/preferences/theme", response_model=UserDTO)
async def update_theme_preference(
    payload: ThemePreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    normalized = payload.preferred_theme.strip().lower()
    if normalized not in ("light", "dark"):
        normalized = "light"
    if current_user.preferred_theme != normalized:
        current_user.preferred_theme = normalized
        await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/register", response_model=AuthResponse)
async def register(
    user_in: UserCreate, request: Request, db: AsyncSession = Depends(get_db)
):
    """Register a new user."""
    language = get_request_language(request)

    # Check if user exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=auth_message("email_already_registered", language),
        )

    # Create new user
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        password_hash=hashed_password,
        full_name=user_in.full_name,
        preferred_language=language,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Generate Token
    access_token = create_access_token(subject=new_user.email)
    return AuthResponse(access_token=access_token, token_type="bearer")


@router.post("/login", response_model=AuthResponse)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Login a user."""
    language = get_request_language(request)

    # Authenticate User
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()

    # Check if user exists
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=auth_message("not_registered", language),
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user exists and is active
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=auth_message("account_not_active", language),
        )

    # Check password
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=auth_message("incorrect_credentials", language),
            headers={"WWW-Authenticate": "Bearer"},
        )

    await persist_user_language(user, language, db)

    # Generate Token
    access_token = create_access_token(subject=user.email)
    return AuthResponse(access_token=access_token, token_type="bearer")


@router.post("/google", response_model=AuthResponse)
async def google_login(
    token_data: GoogleToken, request: Request, db: AsyncSession = Depends(get_db)
):
    """Login a user with Google."""
    language = get_request_language(request)

    # 1. Verify Token with Google
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_data.token}"},
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=auth_message("invalid_google_token", language),
            )

        google_info = resp.json()

    email = google_info.get("email")
    name = google_info.get("name", "Google User")

    if not email:
        raise HTTPException(
            status_code=400,
            detail=auth_message("google_missing_email", language),
        )

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
            email=email,
            full_name=name,
            password_hash=hashed_password,
            status="active",
            preferred_language=language,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        await persist_user_language(user, language, db)

    # 4. Issue App Token
    access_token = create_access_token(subject=user.email)
    return AuthResponse(access_token=access_token, token_type="bearer")
