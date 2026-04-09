import asyncio
import logging
import sys
import time

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from nutri.ai.checkpoint import close_checkpointer, init_checkpointer
from nutri.api.routers import (
    auth,
    chat,
    collections,
    draft_edit,
    grocery,
    inventory,
    memory,
    menus,
    onboarding,
    profile,
    recipes,
    system,
)
from nutri.common.config.logging_config import setup_logging
from nutri.common.config.settings import settings
from nutri.core.db.session import Base, engine
from starlette.middleware.base import RequestResponseEndpoint

setup_logging()
logger = logging.getLogger("nutri.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    logger.info("Starting %s (env=%s)", settings.PROJECT_NAME, settings.ENVIRONMENT)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)

    logger.info("Database tables ready")
    await init_checkpointer()

    yield

    # SHUTDOWN
    logger.info("Shutting down %s", settings.PROJECT_NAME)
    await close_checkpointer()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)


# CORS (Allow Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(
    request: Request, call_next: RequestResponseEndpoint
) -> Response:
    """
    Log incoming HTTP requests and outgoing responses, appending the extracted client IP.

    Args:
        request: The incoming FastAPI HTTP request.
        call_next: The next callable in the middleware chain.

    Returns:
        The generated HTTP Response object.
    """
    start = time.perf_counter()

    client_host = request.client.host if request.client else "unknown"
    x_forwarded_for = request.headers.get("X-Forwarded-For")

    # Priority extraction: Unverified X-Forwarded-For headers take precedence
    # only if the underlying infrastructure relies on application-level parsing.
    actual_ip = (
        x_forwarded_for.split(",")[0].strip() if x_forwarded_for else client_host
    )

    # logger.debug("→ %s %s | ip=%s", request.method, request.url.path, actual_ip)

    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            "Unhandled error on %s %s | ip=%s",
            request.method,
            request.url.path,
            actual_ip,
        )
        raise

    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "← %s %s | status=%d | %.1fms | ip=%s",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        actual_ip,
    )

    return response


# Include Routers
app.include_router(
    onboarding.router, prefix=f"{settings.API_V1_STR}/onboarding", tags=["Onboarding"]
)
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(menus.router, prefix=f"{settings.API_V1_STR}/menus", tags=["Menus"])
app.include_router(
    profile.router, prefix=f"{settings.API_V1_STR}/profile", tags=["Profile"]
)
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["Chat"])
app.include_router(
    memory.router, prefix=f"{settings.API_V1_STR}/memory", tags=["Memory"]
)
app.include_router(
    collections.router,
    prefix=f"{settings.API_V1_STR}/collections",
    tags=["Collections"],
)
app.include_router(
    grocery.router, prefix=f"{settings.API_V1_STR}/grocery", tags=["Grocery"]
)
app.include_router(
    inventory.router, prefix=f"{settings.API_V1_STR}/inventory", tags=["Inventory"]
)
app.include_router(
    recipes.router, prefix=f"{settings.API_V1_STR}/recipes", tags=["Recipes"]
)
app.include_router(
    system.router, prefix=f"{settings.API_V1_STR}/system", tags=["System"]
)
app.include_router(
    draft_edit.router, prefix=f"{settings.API_V1_STR}/draft", tags=["Draft Edit"]
)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "nutri.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
