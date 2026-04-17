# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import os
import logging

from langchain_core.tools import tool
from langchain_core.messages import HumanMessage
from langchain_core.runnables.config import RunnableConfig  # noqa: TC002
from langchain_community.tools.tavily_search import TavilySearchResults

from nutri.ai.language import get_language_from_config
from nutri.ai.llm_client import get_llm
from nutri.common.config.settings import settings


os.environ["TAVILY_API_KEY"] = settings.TAVILY_API_KEY

logger = logging.getLogger("nutri.ai.tools.knowledge")


@tool
def get_diet_reference(
    diet_type: str, reference_name: str, *, config: RunnableConfig
) -> dict:
    """Retrieves authoritative diet reference materials.

    (E.g. lists of approved foods for Keto).
    """
    language = get_language_from_config(config)
    prompt = (
        f"Provide a brief medical and dietary reference guide for {diet_type} "
        f"specifically regarding {reference_name}. "
        f"Respond in language code: {language}."
    )
    llm = get_llm()
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"content": response.content}


@tool
def enrich_attribute_metadata(category: str, value: str) -> dict:
    """Calls a background extraction agent to build medical rules.

    Use this when the user mentions a new health condition or allergy.
    """
    from nutri.ai.agents.enrich_metadata_agent import EnrichMetadataAgent

    agent = EnrichMetadataAgent()
    result = agent.enrich(category, value)
    return result.model_dump()


@tool
def web_search_info(query: str, *, config: RunnableConfig) -> str:
    """Search the web.

    Use this to answer questions like "giá vàng hôm nay bao nhiêu?".

    Returns:
        A string containing concise result snippets with source titles and URLs.
    """
    try:
        search = TavilySearchResults(max_results=5)
        results = search.invoke(query)

        if not results:
            return "No results found for your query. Try rephrasing."

        formatted_results = []
        for idx, res in enumerate(results, start=1):
            title = (res.get("title") or "Untitled source").strip()
            url = (res.get("url") or "").strip()
            content = (res.get("content") or "").strip()

            if content:
                content = " ".join(content.split())
                if len(content) > 500:
                    content = f"{content[:497]}..."

            lines = [f"Source {idx}: {title}"]
            if url:
                lines.append(f"URL: {url}")
            if content:
                lines.append(f"Snippet: {content}")
            else:
                lines.append("Snippet: (no preview content)")

            formatted_results.append("\n".join(lines))

        return "\n\n".join(formatted_results)
    except Exception:
        logger.exception("web_search_info error")
        return "Error performing web search"
