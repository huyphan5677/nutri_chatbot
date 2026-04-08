from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Nutri API"
    ENVIRONMENT: Literal["local", "production"] = "local"

    # SECURITY
    SECRET_KEY: str = "supersecretkey"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 1  # 1 days

    # DATABASE
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "nutri"
    POSTGRES_PORT: int = 5432

    # Allow overriding with full URL (used in Docker)
    DATABASE_URL: str | None = None

    # AI Services
    GEMINI_API_KEY: str
    GEMINI_API_ENDPOINT: str

    LLM_PROVIDER: Literal["gemini", "openai"] = "openai"
    MODEL_NAME: str | None = None
    TEMPERATURE: float = 0.5

    # Web search API
    TAVILY_API_KEY: str

    # Mem0 Vector Memory
    MEM0_EMBEDDING_PROVIDER: str = "openai"
    MEM0_EMBEDDING_MODEL: str = "jina-embeddings-v5-text-small"
    MEM0_EMBEDDING_API_KEY: str | None = None
    MEM0_EMBEDDING_API_BASE: str = "https://api.jina.ai/v1"
    MEM0_EMBEDDING_DIMS: int = 1024

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"


settings = Settings()
