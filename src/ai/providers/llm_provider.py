from __future__ import annotations

import os
import re
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


def chat_completion(*, messages: list[dict[str, str]], response_format_json: bool = True) -> str:
    config = _load_config()
    payload: dict = {
        "model": config.model,
        "messages": messages,
        "temperature": config.temperature,
    }
    if response_format_json:
        payload["response_format"] = {"type": "json_object"}

    try:
        response = httpx.post(
            f"{config.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=60.0,
        )
    except httpx.RequestError as exc:
        raise LLMProviderError(f"Could not reach selected LLM provider: {exc.__class__.__name__}") from exc

    if response.status_code >= 400:
        raise LLMProviderError(
            f"LLM provider returned HTTP {response.status_code}",
            status_code=502,
            error="LLM request failed",
        )

    try:
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise LLMProviderError("LLM provider response did not match chat completions format", status_code=502) from exc


def _load_config() -> LLMConfig:
    provider = _env("LLM_PROVIDER")
    if not provider:
        raise LLMProviderError("LLM_PROVIDER is not configured")

    normalized_provider = provider.strip().lower()
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
