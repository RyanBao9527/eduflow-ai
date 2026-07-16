from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = Field(default="EduFlow AI API", alias="APP_NAME")
    app_environment: Literal["development", "test", "production"] = Field(
        default="development",
        alias="APP_ENVIRONMENT",
    )
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        alias="CORS_ORIGINS",
    )

    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_base_url: str = Field(
        default="https://api.deepseek.com",
        alias="OPENAI_BASE_URL",
    )
    openai_model: str = Field(default="", alias="OPENAI_MODEL")
    request_timeout: int = Field(default=180, ge=1, alias="REQUEST_TIMEOUT")
    max_context_length: int | None = Field(
        default=None,
        ge=1,
        alias="MAX_CONTEXT_LENGTH",
    )
    temp_dir: str = Field(default="./temp", alias="TEMP_DIR")


@lru_cache
def get_settings() -> Settings:
    return Settings()
