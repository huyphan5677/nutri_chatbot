# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import logging
from typing import Any

from tavily import TavilyClient
from langchain_core.prompts import PromptTemplate

from nutri.ai.llm_client import get_llm
from nutri.core.recipes.entities import RecipeList
from nutri.common.config.settings import settings


logger = logging.getLogger("nutri.ai.tools.recipe_tools")


async def perform_recipe_web_search(query: str) -> list[dict[str, Any]] | None:
    """Search the web for a recipe.

    Returns a list of dictionaries matching RecipeCreate schema.

    Args:
        query: The query to search for.

    Returns:
        list[dict[str, Any]] | None: A list of dictionaries matching RecipeCreate schema.

    Raises:
        ValueError: If the TAVILY_API_KEY environment variable is not set.
    """
    logger.info("Performing web search for: %s", query)

    # Initialize Tavily
    tavily_api_key = settings.TAVILY_API_KEY
    if not tavily_api_key:
        logger.error("TAVILY_API_KEY environment variable not set.")
        msg = (
            "TAVILY_API_KEY environment variable is not configured. "
            "Web search unavailable."
        )
        raise ValueError(msg)

    client = TavilyClient(api_key=tavily_api_key)

    # 1. Search the web
    search_query = f"{query} recipe with ingredients and instructions"
    try:
        response = client.search(
            query=search_query,
            search_depth="advanced",
            include_answer=False,
            include_raw_content=True,
            max_results=3,
        )
    except Exception:
        logger.exception("Tavily search failed")
        return None

    # 2. Extract content from best results
    results = response.get("results", [])
    if not results:
        logger.warning("No results found for query: %s", query)
        return None

    # We will combine the raw content from the top 2 results to give the
    # LLM enough context
    context = ""
    source_url = ""
    for idx, res in enumerate(results[:2]):
        context += f"\n\n--- Source {idx + 1}: {res.get('url')} ---\n"
        context += res.get("raw_content", res.get("content", ""))
        if idx == 0:
            source_url = res.get("url")

    # 3. Use LLM to extract structured data
    llm = get_llm(temperature=0.1)  # low temp for extraction

    # We use function calling / structured output binding
    llm_with_structure = llm.with_structured_output(RecipeList)

    prompt = PromptTemplate.from_template(
        "You are an expert culinary assistant. Extract AS MANY recipes AS YOU CAN FIND from the provided search results below.\n"
        "Fill out all the fields in the requested schema for each recipe. If information like prep time or calories is missing, try to estimate or leave it null.\n"
        "Format 'instructions' as a single string with steps separated by newlines.\n"
        "Here are the search results:\n{context}"
    )

    chain = prompt | llm_with_structure

    try:
        extracted_recipes_wrapper: RecipeList = await chain.ainvoke({
            "context": context
        })

        # Convert to dict and add source URL to each
        recipe_dicts = []
        for recipe in extracted_recipes_wrapper.recipes:
            recipe_dict = recipe.model_dump()
            recipe_dict["source_url"] = source_url
            recipe_dicts.append(recipe_dict)

        return recipe_dicts
    except Exception:
        logger.exception("LLM extraction failed")
        return None
