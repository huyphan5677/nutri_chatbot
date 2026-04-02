from typing import Union

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from nutri.common.config.settings import settings


def get_llm(
    provider: str = settings.LLM_PROVIDER,
    model_name: str = settings.MODEL_NAME or None,
    temperature: float = settings.TEMPERATURE,
) -> Union[ChatGoogleGenerativeAI, ChatOpenAI]:
    """
    Create and return an LLM client based on the selected provider.

    Args:
        provider (LLMProvider): LLM provider ("gemini" or "openai").
        model_name (str | None): Model name. If None, default per provider is used.
        temperature (float): Sampling temperature.

    Returns:
        Union[ChatGoogleGenerativeAI, ChatOpenAI]: Configured LLM instance.

    Raises:
        ValueError: If provider is not supported.
    """
    if provider == "gemini":
        return _get_gemini_llm(
            model_name=model_name or "gemini-2.5-flash",
            temperature=temperature,
        )

    if provider == "openai":
        return _get_openai_llm(
            model_name=model_name or "qwen3-vl-plus",
            temperature=temperature,
        )

    raise ValueError(f"Unsupported provider: {provider}")


def _get_gemini_llm(
    model_name: str,
    temperature: float,
) -> ChatGoogleGenerativeAI:
    """
    Initialize Gemini LLM.

    Args:
        model_name (str): Gemini model name.
        temperature (float): Sampling temperature.

    Returns:
        ChatGoogleGenerativeAI: Configured Gemini client.
    """
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=temperature,
        client_options={"api_endpoint": settings.GEMINI_API_ENDPOINT},
    )


def _get_openai_llm(
    model_name: str,
    temperature: float,
) -> ChatOpenAI:
    """
    Initialize OpenAI-compatible LLM (self-hosted).

    Args:
        model_name (str): Model name.
        temperature (float): Sampling temperature.

    Returns:
        ChatOpenAI: Configured OpenAI-compatible client.
    """
    return ChatOpenAI(
        model=model_name,
        api_key=settings.GEMINI_API_KEY,
        base_url=settings.GEMINI_API_ENDPOINT + "/v1",
        temperature=temperature,
    )
