# Copyright (c) 2026 Nutri. All rights reserved.s
"""Logging configuration for the Nutri backend.

Creates two rotating log files:
  - logs/nutri.log       : All app logs (DEBUG+)
  - logs/ai_agent.log    : AI agent & tool logs only

Usage:
    from nutri.common.config.logging_config import setup_logging
    setup_logging()
"""

from __future__ import annotations

import logging
import logging.handlers
from pathlib import Path


LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Loggers used for AI components — these go to the dedicated ai_agent.log too
AI_LOGGER_NAMES = [
    "nutri.ai",
    "nutri.core.grocery.product_validator",
    "nutri.core.grocery.mart_search",
    "nutri.core.grocery.shopping_bg",
    "nutri.api.routers.recipes",
    "nutri.api.routers.menus",
    "nutri.api.routers.onboarding",
    "nutri.api.routers.memory",
]


def setup_logging(log_dir: str = "logs") -> None:
    """Set up application-wide logging.

    Call this once at application startup (e.g., in api/main.py lifespan).

    Args:
        log_dir: Directory where log files will be created (relative to CWD).
                 Defaults to "logs/" next to where you run uvicorn from.
    """
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)

    formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)

    # Console handler (INFO and above)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)

    # Rotating file handler — App logs (DEBUG and above)
    app_file_handler = logging.handlers.RotatingFileHandler(
        log_path / "nutri.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    app_file_handler.setLevel(logging.DEBUG)
    app_file_handler.setFormatter(formatter)

    # Rotating file handler — AI agent logs only
    ai_file_handler = logging.handlers.RotatingFileHandler(
        log_path / "ai_agent.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    ai_file_handler.setLevel(logging.DEBUG)
    ai_file_handler.setFormatter(formatter)

    # Nutri App Logger (HTTP, Routers, Core)
    app_logger = logging.getLogger("nutri")
    app_logger.setLevel(logging.DEBUG)
    app_logger.propagate = False
    app_logger.handlers.clear()
    app_logger.addHandler(console_handler)
    app_logger.addHandler(app_file_handler)

    # AI Logger (Agents, LangChain)
    for name in AI_LOGGER_NAMES:
        ai_logger = logging.getLogger(name)
        ai_logger.setLevel(logging.DEBUG)
        ai_logger.propagate = False
        ai_logger.handlers.clear()
        ai_logger.addHandler(console_handler)
        ai_logger.addHandler(ai_file_handler)

    # Root logger (Third-party logs)
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    if not root_logger.handlers:
        root_logger.addHandler(console_handler)

    # Silence overly noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("langchain").setLevel(logging.WARNING)
    logging.getLogger("langgraph").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("google").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    app_logger.info(
        "Logging configured — nutrition logs to nutri.log, AI logs to ai_agent.log"
    )
