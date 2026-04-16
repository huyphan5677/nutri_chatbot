# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import re
import logging
from typing import Any

from langdetect import DetectorFactory, LangDetectException, detect_langs


logger = logging.getLogger("nutri.ai.language")

# Keep detector deterministic across runs.
DetectorFactory.seed = 0

# Common English words and keywords for meal planning to help heuristic detection
EN_WORDS = {
    "i",
    "me",
    "my",
    "mine",
    "you",
    "your",
    "yours",
    "he",
    "him",
    "his",
    "she",
    "her",
    "hers",
    "it",
    "its",
    "we",
    "us",
    "our",
    "ours",
    "they",
    "them",
    "their",
    "theirs",
    "am",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "a",
    "an",
    "the",
    "and",
    "but",
    "if",
    "or",
    "because",
    "as",
    "until",
    "while",
    "of",
    "at",
    "by",
    "for",
    "with",
    "about",
    "against",
    "between",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "to",
    "from",
    "up",
    "down",
    "in",
    "out",
    "on",
    "off",
    "over",
    "under",
    "again",
    "further",
    "then",
    "once",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "all",
    "any",
    "both",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "no",
    "nor",
    "not",
    "only",
    "own",
    "same",
    "so",
    "than",
    "too",
    "very",
    "s",
    "t",
    "can",
    "will",
    "just",
    "don",
    "should",
    "now",
    "create",
    "make",
    "generate",
    "dinner",
    "lunch",
    "breakfast",
    "meal",
    "food",
    "plan",
    "want",
    "need",
    "give",
    "show",
}


def normalize_language(language: str | None, default: str = "en") -> str:
    """Normalize language code to standard format."""
    if not language:
        return default
    lang = str(language).strip().replace("_", "-").lower()
    if not lang:
        return default
    primary = lang.split("-")[0]
    return primary if len(primary) == 2 and primary.isalpha() else default


def heuristic_english_check(text: str) -> bool:
    """Check if the text consists mostly of common English words."""
    # Non-ASCII usually indicates Vietnamese or other languages in this app
    if not text.isascii():
        return False

    words = re.findall(r"\b[a-zA-Z]+\b", text.lower())
    if not words:
        return False

    en_count = sum(1 for w in words if w in EN_WORDS)
    return en_count / len(words) >= 0.5


def detect_user_language(text: str | None, default: str = "en") -> str:
    """Detect user language from text."""
    if not text:
        return default

    candidate = text.strip()
    if len(candidate) < 2:
        return default

    try:
        # Avoid langdetect flakiness for short english sentences
        if len(candidate) <= 50 and heuristic_english_check(candidate):
            return "en"

        langs = detect_langs(candidate)
        if langs:
            return normalize_language(langs[0].lang, default=default)
        return default
    except LangDetectException:
        return default
    except Exception as exc:
        logger.debug("detect_user_language failed: %s", exc)
        return default


def get_language_from_config(config: Any, default: str = "en") -> str:
    """Get language from config."""
    try:
        cfg = config.get("configurable", {}) if config else {}
        return normalize_language(cfg.get("language"), default=default)
    except Exception:
        return default
