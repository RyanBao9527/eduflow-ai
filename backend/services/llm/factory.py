from backend.config import Settings
from backend.services.llm.base import (
    LLMConfigurationError,
    LLMProvider,
    LLMProviderUnsupportedError,
)
from backend.services.llm.deepseek import DeepSeekProvider


def create_llm_provider(settings: Settings) -> LLMProvider:
    provider_name = settings.llm_provider.strip().lower()
    missing = [
        name
        for name, value in (
            ("LLM_PROVIDER", provider_name),
            ("LLM_MODEL", settings.llm_model.strip()),
            ("LLM_BASE_URL", settings.llm_base_url.strip()),
            ("LLM_API_KEY", settings.llm_api_key.strip()),
        )
        if not value
    ]
    if missing:
        raise LLMConfigurationError(
            f"Missing required LLM configuration: {', '.join(missing)}"
        )

    providers = {
        "deepseek": DeepSeekProvider,
    }
    provider_class = providers.get(provider_name)
    if provider_class is None:
        raise LLMProviderUnsupportedError(
            f"Unsupported LLM provider: {provider_name}"
        )
    return provider_class(settings)
