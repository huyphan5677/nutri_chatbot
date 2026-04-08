import logging
import json
import os
from typing import Optional, Literal

from mem0 import Memory
from mem0.embeddings.openai import OpenAIEmbedding
from mem0.llms.openai import OpenAILLM
from nutri.common.config.settings import settings

from nutri.ai.llm_client import get_llm
from langchain_core.messages import HumanMessage, SystemMessage
from mem0.memory.main import Memory as Mem0Main

logger = logging.getLogger("nutri.ai.memory")


original_embed = OpenAIEmbedding.embed

def patched_embed(self, text: str, memory_action: Optional[Literal["add", "search", "update"]] = None):
    text = text.replace("\n", " ")
    kwargs = {
        "input": [text],
        "model": self.config.model,
        "encoding_format": "float",
    }

    model_lower = self.config.model.lower()
    if "jina" in model_lower:
        # FOR JINA V5: 'retrieval.passage' for indexing, 'retrieval.query' for searching
        task = "retrieval.query"
        if memory_action in ["add", "update"]:
            task = "retrieval.passage"
        kwargs["extra_body"] = {"task": task, "normalized": True}
    elif any(kw in model_lower for kw in ["nemotron", "nvidia", "bge"]):
        kwargs["extra_body"] = {"input_type": "query", "truncate": "NONE"}

    if getattr(self, "_pass_dimensions_to_api", False) and self.config.embedding_dims:
        kwargs["dimensions"] = self.config.embedding_dims

    return self.client.embeddings.create(**kwargs).data[0].embedding

OpenAIEmbedding.embed = patched_embed


original_generate_response = OpenAILLM.generate_response

def patched_generate_response(self, messages: list, **kwargs):
    max_retries = 5
    for attempt in range(max_retries + 1):
        try:
            llm = get_llm(temperature=0)
            lc_messages = []
            for m in messages:
                content = m.get("content", "")
                if m.get("role") == "system":
                    # Detailed but efficient prompt to ensure high quality extraction in original language
                    if len(content) > 500:
                        content = """Extract key facts and health preferences about the user from the conversation or style.
                    - Focus on dietary restrictions, allergies, likes, and dislikes.
                    - Record the facts in the SAME language as the user's input.
                    - Return ONLY a valid JSON object with a 'facts' key containing a list of strings."""
                    lc_messages.append(SystemMessage(content=content))
                else:
                    lc_messages.append(HumanMessage(content=content))

            response = llm.invoke(lc_messages)
            if response and response.content:
                return response.content

            raise ValueError("Empty response content")

        except Exception as e:
            if attempt < max_retries:
                logger.warning(f"Mem0 LLM retry {attempt+1}/{max_retries} due to: {e}")
                continue
            logger.error(f"Mem0 LangChain Extension Final Error: {e}")
            return original_generate_response(self, messages, **kwargs)

OpenAILLM.generate_response = patched_generate_response


original_search = Mem0Main.search
original_add = Mem0Main.add

def patched_add(self, data, user_id=None, **kwargs):
    if user_id:
        user_id = str(user_id)
    return original_add(self, data, user_id=user_id, **kwargs)

def patched_search(self, query: str, user_id: Optional[str] = None, **kwargs):
    if user_id:
        user_id = str(user_id)

    if 'limit' not in kwargs or kwargs['limit'] < 10:
        kwargs['limit'] = 10

    logger.info(f"Mem0 Search Attempt | query='{query}' | user_id='{user_id}' (string-normalized)")

    if user_id:
        if 'filters' not in kwargs:
            kwargs['filters'] = {}
        kwargs['filters']["user_id"] = user_id

    results = original_search(self, query, user_id=user_id, **kwargs)

    if not results:
        logger.warning(f"Mem0 Search result EMPTY for user_id='{user_id}'. This might be a vector score issue.")
    else:
        logger.info(f"Mem0 Search success | Found {len(results)} potential memories.")

    return results

Mem0Main.add = patched_add
Mem0Main.search = patched_search
_memory_instance = None


def get_nutri_memory() -> Memory:
    """Get the singleton instance of Mem0 Memory."""
    global _memory_instance
    if _memory_instance is not None:
        return _memory_instance

    base_url = settings.GEMINI_API_ENDPOINT
    if base_url and not base_url.endswith("/v1"):
        base_url = base_url.rstrip("/") + "/v1"

    llm_config = {
        "model": settings.MODEL_NAME,
        "temperature": 0.2,
        "api_key": settings.GEMINI_API_KEY,
        "openai_base_url": base_url
    }

    embedder_config = {
        "model": settings.MEM0_EMBEDDING_MODEL,
        "api_key": settings.MEM0_EMBEDDING_API_KEY,
    }
    if settings.MEM0_EMBEDDING_API_BASE:
        embedder_config["openai_base_url"] = settings.MEM0_EMBEDDING_API_BASE

    config = {
        "vector_store": {
            "provider": "pgvector",
            "config": {
                "dbname": settings.POSTGRES_DB,
                "user": settings.POSTGRES_USER,
                "password": settings.POSTGRES_PASSWORD,
                "host": settings.POSTGRES_SERVER,
                "port": settings.POSTGRES_PORT,
                "collection_name": "nutri_memories",
                "embedding_model_dims": settings.MEM0_EMBEDDING_DIMS
            }
        },
        "llm": {
            "provider": settings.LLM_PROVIDER,
            "config": llm_config
        },
        "embedder": {
            "provider": settings.MEM0_EMBEDDING_PROVIDER,
            "config": embedder_config
        }
    }

    try:
        _memory_instance = Memory.from_config(config)
        logger.info("Initialized Mem0 Memory instance successfully.")
    except Exception as e:
        logger.error("Failed to initialize Mem0 Memory: %s", e)
        raise e

    return _memory_instance
