# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import sys
import logging
from unittest.mock import patch

import structlog

import pytest

from logger import configure_logger


@pytest.fixture(autouse=True)
def reset_logging():
    """Reset structlog and logging configurations between tests."""
    structlog.reset_defaults()
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    yield
    structlog.reset_defaults()


def test_configure_logger_returns_bound_logger():
    """Test that the function returns a structlog logger."""
    logger = configure_logger()
    assert hasattr(logger, "info")
    assert hasattr(logger, "debug")


@patch("logging.basicConfig")
def test_configure_logger_json_logs_true(mock_basic_config):
    """Test configuration when json_logs is True."""
    logger = configure_logger(level="DEBUG", json_logs=True)

    # basicConfig should be called with standard sys.stdout and format
    mock_basic_config.assert_called_once_with(
        format="%(message)s",
        stream=sys.stdout,
        level="DEBUG",
    )

    # Check that structlog is configured correctly
    assert structlog.is_configured()
    assert hasattr(logger, "info")


@patch("logging.basicConfig")
def test_configure_logger_json_logs_false_with_rich(mock_basic_config):
    """Test configuration when json_logs is False and rich is available."""
    # We don't patch rich out, so normally it should instantiate RichHandler
    logger = configure_logger(level="INFO", json_logs=False)

    assert mock_basic_config.called
    kwargs = mock_basic_config.call_args[1]

    assert kwargs["level"] == "INFO"
    assert kwargs["format"] == "%(message)s"
    assert "handlers" in kwargs

    # Check that the handler is a RichHandler
    from rich.logging import RichHandler

    assert isinstance(kwargs["handlers"][0], RichHandler)
    assert structlog.is_configured()


@patch.dict("sys.modules", {"rich.logging": None})
@patch("logging.basicConfig")
def test_configure_logger_json_logs_false_without_rich(mock_basic_config):
    """Test configuration when json_logs is False but rich is not installed."""
    logger = configure_logger(level="WARNING", json_logs=False)

    mock_basic_config.assert_called_once_with(
        format="%(message)s",
        stream=sys.stdout,
        level="WARNING",
    )
    assert structlog.is_configured()
