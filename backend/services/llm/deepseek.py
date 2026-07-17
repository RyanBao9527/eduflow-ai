from typing import Any

import httpx

from backend.config import Settings
from backend.services.llm.base import (
    LLMBalanceError,
    LLMAuthenticationError,
    LLMInvalidResponseError,
    LLMRateLimitError,
    LLMServiceUnavailableError,
    LLMTimeoutError,
    LLMUsage,
    StructuredOutputRequest,
    StructuredOutputResult,
)


class DeepSeekProvider:
    def __init__(
        self,
        settings: Settings,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._settings = settings
        self._client = client

    async def generate_structured_output(
        self,
        request: StructuredOutputRequest,
    ) -> StructuredOutputResult:
        payload = {
            "model": self._settings.llm_model,
            "messages": [
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": request.user_prompt},
            ],
            "thinking": {"type": "disabled"},
            "stream": False,
            "temperature": request.temperature,
            "response_format": {"type": "json_object"},
            "max_tokens": request.max_output_tokens,
        }
        headers = {
            "Authorization": f"Bearer {self._settings.llm_api_key}",
            "Content-Type": "application/json",
        }
        url = f"{self._settings.llm_base_url.rstrip('/')}/chat/completions"

        try:
            if self._client is not None:
                response = await self._client.post(url, headers=headers, json=payload)
            else:
                async with httpx.AsyncClient(
                    timeout=self._settings.llm_request_timeout
                ) as client:
                    response = await client.post(url, headers=headers, json=payload)
        except httpx.TimeoutException as exc:
            raise LLMTimeoutError("The configured LLM provider timed out") from exc
        except httpx.RequestError as exc:
            raise LLMServiceUnavailableError(
                "The configured LLM provider could not be reached"
            ) from exc

        self._raise_for_status(response)
        try:
            body: dict[str, Any] = response.json()
            choice = body["choices"][0]
            content = choice["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise LLMInvalidResponseError(
                "The configured LLM provider returned an invalid response"
            ) from exc

        if not isinstance(content, str) or not content.strip():
            raise LLMInvalidResponseError(
                "The configured LLM provider returned empty content"
            )

        usage = body.get("usage") or {}
        prompt_tokens = _non_negative_int(usage.get("prompt_tokens"))
        cache_hit_tokens = _non_negative_int(usage.get("prompt_cache_hit_tokens"))
        cache_miss_tokens = _non_negative_int(usage.get("prompt_cache_miss_tokens"))
        if cache_hit_tokens == 0 and cache_miss_tokens == 0:
            cache_miss_tokens = prompt_tokens
        completion_tokens = _non_negative_int(usage.get("completion_tokens"))
        total_tokens = _non_negative_int(usage.get("total_tokens"))
        if total_tokens == 0:
            total_tokens = prompt_tokens + completion_tokens

        return StructuredOutputResult(
            content=content,
            provider=self._settings.llm_provider,
            model=str(body.get("model") or self._settings.llm_model),
            finish_reason=choice.get("finish_reason"),
            usage=LLMUsage(
                prompt_tokens=prompt_tokens,
                prompt_cache_hit_tokens=cache_hit_tokens,
                prompt_cache_miss_tokens=cache_miss_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
            ),
        )

    @staticmethod
    def _raise_for_status(response: httpx.Response) -> None:
        if response.status_code < 400:
            return
        if response.status_code == 401:
            raise LLMAuthenticationError("LLM authentication failed")
        if response.status_code == 402:
            raise LLMBalanceError("LLM account balance is unavailable")
        if response.status_code == 429:
            raise LLMRateLimitError("LLM rate limit reached")
        if response.status_code in {500, 503}:
            raise LLMServiceUnavailableError("LLM service is unavailable")
        raise LLMInvalidResponseError(
            f"LLM provider rejected the request with status {response.status_code}"
        )


def _non_negative_int(value: Any) -> int:
    return value if isinstance(value, int) and value >= 0 else 0
