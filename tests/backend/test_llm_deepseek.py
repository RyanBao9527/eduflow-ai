import json

import httpx
import pytest

from backend.config import Settings
from backend.services.llm.base import (
    LLMRateLimitError,
    StructuredOutputRequest,
)
from backend.services.llm.deepseek import DeepSeekProvider


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def settings() -> Settings:
    return Settings(
        LLM_PROVIDER="deepseek-test",
        LLM_MODEL="model-from-config",
        LLM_BASE_URL="https://provider.example",
        LLM_API_KEY="secret-test-key",
    )


def request() -> StructuredOutputRequest:
    return StructuredOutputRequest(
        system_prompt="system",
        user_prompt="return json",
        json_schema={"type": "object"},
        max_output_tokens=1234,
        temperature=0.2,
        request_id="request-1",
    )


@pytest.mark.anyio
async def test_deepseek_uses_runtime_configuration_and_returns_actual_metadata() -> None:
    async def handler(incoming: httpx.Request) -> httpx.Response:
        assert str(incoming.url) == "https://provider.example/chat/completions"
        assert incoming.headers["authorization"] == "Bearer secret-test-key"
        body = json.loads(incoming.content)
        assert body["model"] == "model-from-config"
        assert body["response_format"] == {"type": "json_object"}
        assert body["thinking"] == {"type": "disabled"}
        assert body["max_tokens"] == 1234
        return httpx.Response(
            200,
            json={
                "model": "actual-provider-model",
                "choices": [
                    {"message": {"content": '{"ok":true}'}, "finish_reason": "stop"}
                ],
                "usage": {
                    "prompt_tokens": 10,
                    "prompt_cache_hit_tokens": 3,
                    "prompt_cache_miss_tokens": 7,
                    "completion_tokens": 5,
                    "total_tokens": 15,
                },
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await DeepSeekProvider(settings(), client).generate_structured_output(request())

    assert result.provider == "deepseek-test"
    assert result.model == "actual-provider-model"
    assert result.usage.prompt_cache_hit_tokens == 3
    assert result.usage.total_tokens == 15


@pytest.mark.anyio
async def test_deepseek_maps_rate_limit_to_generic_error() -> None:
    transport = httpx.MockTransport(lambda _: httpx.Response(429, json={"error": "busy"}))
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(LLMRateLimitError):
            await DeepSeekProvider(settings(), client).generate_structured_output(request())
