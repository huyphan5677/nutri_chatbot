import logging
from typing import Any

from langdetect import DetectorFactory, LangDetectException, detect

logger = logging.getLogger("nutri.ai.language")

# Keep detector deterministic across runs.
DetectorFactory.seed = 0


def normalize_language(language: str | None, default: str = "en") -> str:
    if not language:
        return default
    lang = str(language).strip().replace("_", "-").lower()
    if not lang:
        return default
    primary = lang.split("-")[0]
    return primary if len(primary) == 2 and primary.isalpha() else default


def detect_user_language(text: str | None, default: str = "en") -> str:
    if not text:
        return default

    candidate = text.strip()
    if len(candidate) < 2:
        return default

    try:
        return normalize_language(detect(candidate), default=default)
    except LangDetectException:
        return default
    except Exception as exc:
        logger.debug("detect_user_language failed: %s", exc)
        return default


def get_language_from_config(config: Any, default: str = "en") -> str:
    try:
        cfg = config.get("configurable", {}) if config else {}
        return normalize_language(cfg.get("language"), default=default)
    except Exception:
        return default
