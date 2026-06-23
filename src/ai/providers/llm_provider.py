from __future__ import annotations

import os
import re
import time
from dataclasses import dataclass
from pathlib import Path

import httpx
from dotenv import dotenv_values


class LLMProviderError(Exception):
    def __init__(self, detail: str, status_code: int = 400, error: str = "LLM provider error") -> None:
        self.detail = detail
        self.status_code = status_code
        self.error = error


@dataclass(frozen=True)
class LLMConfig:
    provider: str
    api_key: str
    base_url: str
    model: str
    temperature: float


@dataclass(frozen=True)
class LLMRuntimeConfig:
    timeout_seconds: float
    max_retries: int
    retry_backoff_seconds: float
    fallback_enabled: bool
    fallback_providers: list[str]


@dataclass(frozen=True)
class LLMResponse:
    content: str
    provider: str
    model: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None


@dataclass(frozen=True)
class LLMProviderMetadata:
    provider: str | None
    model: str | None
    temperature: float | None


class _RetryableProviderError(Exception):
    def __init__(self, provider_error: LLMProviderError) -> None:
        self.provider_error = provider_error


def chat_completion(*, messages: list[dict[str, str]], response_format_json: bool = True) -> str:
    return chat_completion_with_metadata(
        messages=messages,
        response_format_json=response_format_json,
    ).content


def chat_completion_with_metadata(
    *,
    messages: list[dict[str, str]],
    response_format_json: bool = True,
) -> LLMResponse:
    primary_config = _load_config()
    runtime_config = _runtime_config()
    payload: dict = {
        "model": primary_config.model,
        "messages": messages,
        "temperature": primary_config.temperature,
    }
    if response_format_json:
        payload["response_format"] = {"type": "json_object"}

    retryable_failures = []
    for config in _provider_sequence(primary_config, runtime_config):
        payload["model"] = config.model
        payload["temperature"] = config.temperature
        try:
            return _chat_completion_for_config(config, runtime_config, payload)
        except _RetryableProviderError as exc:
            retryable_failures.append(f"{config.provider}: {exc.provider_error.detail}")
            continue

    if len(retryable_failures) == 1:
        raise LLMProviderError(
            retryable_failures[0],
            status_code=502,
            error="LLM request failed",
        )
    raise LLMProviderError(
        "All configured LLM providers failed with retryable errors: " + "; ".join(retryable_failures),
        status_code=502,
        error="LLM request failed",
    )


def _chat_completion_for_config(
    config: LLMConfig,
    runtime_config: LLMRuntimeConfig,
    payload: dict,
) -> LLMResponse:
    last_error: LLMProviderError | None = None
    attempts = runtime_config.max_retries + 1
    for attempt in range(attempts):
        try:
            return _chat_completion_once(config, runtime_config, payload)
        except _RetryableProviderError as exc:
            last_error = exc.provider_error
            if attempt == attempts - 1:
                raise
            time.sleep(runtime_config.retry_backoff_seconds * (attempt + 1))

    raise _RetryableProviderError(last_error or LLMProviderError("LLM provider failed"))


def _chat_completion_once(
    config: LLMConfig,
    runtime_config: LLMRuntimeConfig,
    payload: dict,
) -> LLMResponse:
    try:
        response = httpx.post(
            f"{config.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=runtime_config.timeout_seconds,
        )
    except (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError) as exc:
        raise _RetryableProviderError(
            LLMProviderError(
                f"Could not reach LLM provider {config.provider}: {exc.__class__.__name__}",
                status_code=502,
                error="LLM request failed",
            )
        ) from exc
    except httpx.RequestError as exc:
        raise LLMProviderError(
            f"LLM provider request could not be created: {exc.__class__.__name__}",
            status_code=502,
            error="LLM request failed",
        ) from exc

    if response.status_code == 429 or response.status_code >= 500:
        raise _RetryableProviderError(
            LLMProviderError(
                f"LLM provider {config.provider} returned retryable HTTP {response.status_code}",
                status_code=502,
                error="LLM request failed",
            )
        )
    if response.status_code >= 400:
        raise LLMProviderError(
            f"LLM provider {config.provider} returned HTTP {response.status_code}",
            status_code=502,
            error="LLM request failed",
        )

    try:
        data = response.json()
        usage = data.get("usage") or {}
        return LLMResponse(
            content=data["choices"][0]["message"]["content"],
            provider=config.provider,
            model=config.model,
            input_tokens=usage.get("prompt_tokens"),
            output_tokens=usage.get("completion_tokens"),
            total_tokens=usage.get("total_tokens"),
        )
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise LLMProviderError("LLM provider response did not match chat completions format", status_code=502) from exc


def get_llm_provider_metadata() -> LLMProviderMetadata:
    provider = _env("LLM_PROVIDER")
    if not provider:
        return LLMProviderMetadata(provider=None, model=None, temperature=_safe_temperature())

    normalized_provider = provider.strip().lower()
    try:
        prefix = _provider_prefix(normalized_provider)
    except LLMProviderError:
        return LLMProviderMetadata(provider=normalized_provider, model=None, temperature=_safe_temperature())
    model = _env(f"{prefix}_MODEL", *_legacy_names(normalized_provider, "MODEL"))
    return LLMProviderMetadata(
        provider=normalized_provider,
        model=model,
        temperature=_safe_temperature(),
    )


def _load_config() -> LLMConfig:
    provider = _env("LLM_PROVIDER")
    if not provider:
        raise LLMProviderError("LLM_PROVIDER is not configured")

    normalized_provider = _canonical_provider(provider)
    prefix = _provider_prefix(normalized_provider)
    api_key = _env(f"{prefix}_API_KEY", *_legacy_names(normalized_provider, "API_KEY"))
    base_url = _clean_base_url(_env(f"{prefix}_BASE_URL", *_legacy_names(normalized_provider, "BASE_URL")))
    model = _env(f"{prefix}_MODEL", *_legacy_names(normalized_provider, "MODEL"))

    missing = [
        name
        for name, value in {
            f"{prefix}_API_KEY": api_key,
            f"{prefix}_BASE_URL": base_url,
            f"{prefix}_MODEL": model,
        }.items()
        if not value
    ]
    if missing:
        raise LLMProviderError(f"Missing LLM provider configuration: {', '.join(missing)}")

    return LLMConfig(
        provider=normalized_provider,
        api_key=api_key,
        base_url=base_url,
        model=model,
        temperature=_temperature(),
    )


def _load_provider_config(provider: str) -> LLMConfig | None:
    normalized_provider = _canonical_provider(provider)
    prefix = _provider_prefix(normalized_provider)
    api_key = _env(f"{prefix}_API_KEY", *_legacy_names(normalized_provider, "API_KEY"))
    base_url = _clean_base_url(_env(f"{prefix}_BASE_URL", *_legacy_names(normalized_provider, "BASE_URL")))
    model = _env(f"{prefix}_MODEL", *_legacy_names(normalized_provider, "MODEL"))
    if not api_key or not base_url or not model:
        return None
    return LLMConfig(
        provider=normalized_provider,
        api_key=api_key,
        base_url=base_url,
        model=model,
        temperature=_temperature(),
    )


def _provider_sequence(primary_config: LLMConfig, runtime_config: LLMRuntimeConfig) -> list[LLMConfig]:
    configs = [primary_config]
    if not runtime_config.fallback_enabled:
        return configs

    for provider in runtime_config.fallback_providers:
        normalized_provider = _canonical_provider(provider)
        if normalized_provider == primary_config.provider:
            continue
        fallback_config = _load_provider_config(normalized_provider)
        if fallback_config is not None:
            configs.append(fallback_config)
    return configs


def _canonical_provider(provider: str) -> str:
    normalized = provider.strip().lower()
    if normalized in {"9_router", "9router"}:
        return "nine_router"
    return normalized


def _provider_prefix(provider: str) -> str:
    if provider == "minimax":
        return "MINIMAX"
    if provider in {"nine_router", "9_router", "9router"}:
        return "NINE_ROUTER"
    raise LLMProviderError(f"Unsupported LLM_PROVIDER: {provider}")


def _legacy_names(provider: str, suffix: str) -> tuple[str, ...]:
    if provider in {"nine_router", "9_router", "9router"}:
        return (f"9_ROUTER_{suffix}", f"9ROUTER_{suffix}")
    return ()


def _env(name: str, *fallback_names: str) -> str | None:
    env_file = _dotenv_values()
    for candidate in (name, *fallback_names):
        value = os.getenv(candidate) or env_file.get(candidate)
        if value:
            return value.strip()
    return None


def _dotenv_values() -> dict[str, str | None]:
    env_path = Path(".env")
    if not env_path.exists():
        return {}
    return dict(dotenv_values(env_path))


def _clean_base_url(value: str | None) -> str | None:
    if not value:
        return None
    markdown_link = re.match(r"^\[[^\]]+\]\((?P<url>[^)]+)\)$", value.strip())
    if markdown_link:
        value = markdown_link.group("url")
    return value.rstrip("/")


def _temperature() -> float:
    raw_value = _env("LLM_TEMPERATURE")
    if raw_value is None:
        return 0.7
    try:
        return float(raw_value)
    except ValueError as exc:
        raise LLMProviderError("LLM_TEMPERATURE must be a number") from exc


def _safe_temperature() -> float | None:
    try:
        return _temperature()
    except LLMProviderError:
        return None


def _runtime_config() -> LLMRuntimeConfig:
    return LLMRuntimeConfig(
        timeout_seconds=_float_env("LLM_TIMEOUT_SECONDS", 60.0),
        max_retries=_int_env("LLM_MAX_RETRIES", 2),
        retry_backoff_seconds=_float_env("LLM_RETRY_BACKOFF_SECONDS", 1.5),
        fallback_enabled=_truthy(_env("LLM_FALLBACK_ENABLED") or "false"),
        fallback_providers=_fallback_providers(),
    )


def _fallback_providers() -> list[str]:
    raw_value = _env("LLM_FALLBACK_PROVIDERS") or "nine_router,minimax"
    providers = []
    for provider in raw_value.split(","):
        stripped = provider.strip()
        if stripped:
            providers.append(_canonical_provider(stripped))
    return providers


def _int_env(name: str, default: int) -> int:
    raw_value = _env(name)
    if raw_value is None:
        return default
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise LLMProviderError(f"{name} must be an integer") from exc
    if value < 0:
        raise LLMProviderError(f"{name} must be greater than or equal to 0")
    return value


def _float_env(name: str, default: float) -> float:
    raw_value = _env(name)
    if raw_value is None:
        return default
    try:
        value = float(raw_value)
    except ValueError as exc:
        raise LLMProviderError(f"{name} must be a number") from exc
    if value <= 0:
        raise LLMProviderError(f"{name} must be greater than 0")
    return value


def _truthy(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}
