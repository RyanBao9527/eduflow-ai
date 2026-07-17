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

    llm_provider: str = Field(default="", alias="LLM_PROVIDER")
    llm_model: str = Field(default="", alias="LLM_MODEL")
    llm_base_url: str = Field(default="", alias="LLM_BASE_URL")
    llm_api_key: str = Field(default="", alias="LLM_API_KEY")
    llm_request_timeout: int = Field(default=120, ge=1, alias="LLM_REQUEST_TIMEOUT")
    llm_max_output_tokens: int = Field(
        default=8000,
        ge=1,
        alias="LLM_MAX_OUTPUT_TOKENS",
    )
    llm_temperature: float = Field(
        default=0.2,
        ge=0,
        le=2,
        alias="LLM_TEMPERATURE",
    )
    max_generated_json_bytes: int = Field(
        default=262_144,
        ge=1024,
        alias="MAX_GENERATED_JSON_BYTES",
    )
    llm_input_cost_per_1m: float | None = Field(
        default=None,
        ge=0,
        alias="LLM_INPUT_COST_PER_1M",
    )
    llm_cache_hit_input_cost_per_1m: float | None = Field(
        default=None,
        ge=0,
        alias="LLM_CACHE_HIT_INPUT_COST_PER_1M",
    )
    llm_output_cost_per_1m: float | None = Field(
        default=None,
        ge=0,
        alias="LLM_OUTPUT_COST_PER_1M",
    )
    llm_pricing_snapshot: str | None = Field(
        default=None,
        alias="LLM_PRICING_SNAPSHOT",
    )
    temp_dir: str = Field(default="./temp", alias="TEMP_DIR")


@lru_cache
def get_settings() -> Settings:
    return Settings()
