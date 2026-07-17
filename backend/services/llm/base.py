from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(frozen=True)
class LLMUsage:
    prompt_tokens: int = 0
    prompt_cache_hit_tokens: int = 0
    prompt_cache_miss_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

    def __add__(self, other: "LLMUsage") -> "LLMUsage":
        return LLMUsage(
            prompt_tokens=self.prompt_tokens + other.prompt_tokens,
            prompt_cache_hit_tokens=(
                self.prompt_cache_hit_tokens + other.prompt_cache_hit_tokens
            ),
            prompt_cache_miss_tokens=(
                self.prompt_cache_miss_tokens + other.prompt_cache_miss_tokens
            ),
            completion_tokens=self.completion_tokens + other.completion_tokens,
            total_tokens=self.total_tokens + other.total_tokens,
        )


@dataclass(frozen=True)
class StructuredOutputRequest:
    system_prompt: str
    user_prompt: str
    json_schema: dict[str, Any]
    max_output_tokens: int
    temperature: float
    request_id: str


@dataclass(frozen=True)
class StructuredOutputResult:
    content: str
    provider: str
    model: str
    finish_reason: str | None
    usage: LLMUsage = field(default_factory=LLMUsage)


class LLMProvider(Protocol):
    async def generate_structured_output(
        self,
        request: StructuredOutputRequest,
    ) -> StructuredOutputResult: ...


class LLMProviderError(Exception):
    code = "LLM_ERROR"
    retryable = False


class LLMConfigurationError(LLMProviderError):
    code = "LLM_NOT_CONFIGURED"


class LLMProviderUnsupportedError(LLMConfigurationError):
    code = "LLM_PROVIDER_UNSUPPORTED"


class LLMAuthenticationError(LLMProviderError):
    code = "LLM_AUTHENTICATION_FAILED"


class LLMBalanceError(LLMProviderError):
    code = "LLM_BALANCE_UNAVAILABLE"


class LLMRateLimitError(LLMProviderError):
    code = "LLM_RATE_LIMITED"
    retryable = True


class LLMTimeoutError(LLMProviderError):
    code = "LLM_TIMEOUT"
    retryable = True


class LLMServiceUnavailableError(LLMProviderError):
    code = "LLM_SERVICE_UNAVAILABLE"
    retryable = True


class LLMInvalidResponseError(LLMProviderError):
    code = "LLM_INVALID_RESPONSE"
    retryable = True
