import pytest

from backend.config import Settings
from backend.services.llm.base import (
    LLMConfigurationError,
    LLMProviderUnsupportedError,
)
from backend.services.llm.deepseek import DeepSeekProvider
from backend.services.llm.factory import create_llm_provider


def test_factory_requires_complete_configuration() -> None:
    with pytest.raises(LLMConfigurationError):
        create_llm_provider(Settings())


def test_factory_rejects_unknown_provider_without_fallback() -> None:
    settings = Settings(
        LLM_PROVIDER="unknown",
        LLM_MODEL="model-x",
        LLM_BASE_URL="https://example.test",
        LLM_API_KEY="test-key",
    )
    with pytest.raises(LLMProviderUnsupportedError):
        create_llm_provider(settings)


def test_factory_creates_configured_deepseek_provider() -> None:
    settings = Settings(
        LLM_PROVIDER="deepseek",
        LLM_MODEL="model-from-env",
        LLM_BASE_URL="https://provider.example",
        LLM_API_KEY="test-key",
    )
    assert isinstance(create_llm_provider(settings), DeepSeekProvider)
