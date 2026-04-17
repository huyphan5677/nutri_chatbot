# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import sys
import logging

import structlog
from rich.logging import RichHandler


def configure_logger(  # noqa: RUF067
    level: str = "INFO",
    *,
    json_logs: bool = False,
) -> structlog.stdlib.BoundLogger:
    """Configure the logger.

    Args:
        json_logs: Whether to use JSON logs.
        level: The log level.

    Returns:
        The logger.
    """
    if json_logs:
        processors = [
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.CallsiteParameterAdder({
                structlog.processors.CallsiteParameter.FILENAME,
                structlog.processors.CallsiteParameter.LINENO,
            }),
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ]
    else:
        processors = [
            structlog.stdlib.add_logger_name,
            structlog.processors.CallsiteParameterAdder({
                structlog.processors.CallsiteParameter.FILENAME,
                structlog.processors.CallsiteParameter.LINENO,
            }),
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.dev.ConsoleRenderer(
                colors=False,  # Let Rich handle the colors natively
                pad_event_to=0,
            ),
        ]

    structlog.configure(
        processors=processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    if json_logs:
        logging.basicConfig(
            format="%(message)s",
            stream=sys.stdout,
            level=level,
        )
    else:
        try:
            handlers = [
                RichHandler(
                    rich_tracebacks=True,
                    markup=True,
                    show_path=True,
                    omit_repeated_times=False,
                )
            ]
            formatter = logging.Formatter("%(message)s")
            for h in handlers:
                h.setFormatter(formatter)
            logging.basicConfig(
                level=level, format="%(message)s", handlers=handlers
            )
        except ImportError:
            logging.basicConfig(
                format="%(message)s", stream=sys.stdout, level=level
            )

    return structlog.get_logger()


logger = configure_logger()  # noqa: RUF067
