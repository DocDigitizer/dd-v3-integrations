"""HTTP transport layer using httpx.

Handles retry with exponential backoff, timeout, and response header extraction.
"""

from __future__ import annotations

import time
from typing import Any, Dict, Optional, Tuple

import httpx

from docdigitizer._config import ClientConfig

_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


def _extract_dd_headers(headers: httpx.Headers) -> Dict[str, Any]:
    """Extract X-DD-* response headers into a dict."""
    result: Dict[str, Any] = {}
    trace_id = headers.get("X-DD-TraceId")
    if trace_id:
        result["trace_id"] = trace_id
    num_pages = headers.get("X-DD-NumberPages")
    if num_pages:
        result["num_pages"] = int(num_pages)
    for key, value in headers.items():
        if key.lower().startswith("x-dd-timer-"):
            timer_name = key[len("X-DD-Timer-") :]
            try:
                result.setdefault("timers", {})[timer_name] = float(value)
            except ValueError:
                pass
    return result


class SyncTransport:
    """Synchronous HTTP transport with retry logic."""

    def __init__(self, config: ClientConfig) -> None:
        self._config = config
        self._client = httpx.Client(
            base_url=config.base_url,
            headers={"X-API-Key": config.api_key},
            timeout=httpx.Timeout(config.timeout),
        )

    def request(
        self,
        method: str,
        path: str,
        *,
        data: Optional[Dict[str, Any]] = None,
        files: Optional[Any] = None,
    ) -> Tuple[int, Dict[str, Any], Dict[str, Any]]:
        """Make an HTTP request with retry.

        Returns (status_code, response_json, dd_headers).
        """
        last_exc: Optional[Exception] = None

        for attempt in range(self._config.max_retries + 1):
            try:
                response = self._client.request(
                    method,
                    path,
                    data=data,
                    files=files,
                )

                dd_headers = _extract_dd_headers(response.headers)

                is_retryable = response.status_code in _RETRYABLE_STATUS_CODES
                if is_retryable and attempt < self._config.max_retries:
                    _backoff(attempt)
                    continue

                body = {}
                if response.headers.get("content-type", "").startswith("application/json"):
                    body = response.json()
                elif response.status_code < 400:
                    body = {"_text": response.text}

                return response.status_code, body, dd_headers

            except (httpx.ConnectError, httpx.ReadTimeout) as exc:
                last_exc = exc
                if attempt < self._config.max_retries:
                    _backoff(attempt)
                    continue
                raise

        raise last_exc  # type: ignore[misc]

    def close(self) -> None:
        self._client.close()


class AsyncTransport:
    """Asynchronous HTTP transport with retry logic."""

    def __init__(self, config: ClientConfig) -> None:
        self._config = config
        self._client = httpx.AsyncClient(
            base_url=config.base_url,
            headers={"X-API-Key": config.api_key},
            timeout=httpx.Timeout(config.timeout),
        )

    async def request(
        self,
        method: str,
        path: str,
        *,
        data: Optional[Dict[str, Any]] = None,
        files: Optional[Any] = None,
    ) -> Tuple[int, Dict[str, Any], Dict[str, Any]]:
        """Make an async HTTP request with retry.

        Returns (status_code, response_json, dd_headers).
        """
        last_exc: Optional[Exception] = None

        for attempt in range(self._config.max_retries + 1):
            try:
                response = await self._client.request(
                    method,
                    path,
                    data=data,
                    files=files,
                )

                dd_headers = _extract_dd_headers(response.headers)

                is_retryable = response.status_code in _RETRYABLE_STATUS_CODES
                if is_retryable and attempt < self._config.max_retries:
                    _backoff(attempt)
                    continue

                body = {}
                if response.headers.get("content-type", "").startswith("application/json"):
                    body = response.json()
                elif response.status_code < 400:
                    body = {"_text": response.text}

                return response.status_code, body, dd_headers

            except (httpx.ConnectError, httpx.ReadTimeout) as exc:
                last_exc = exc
                if attempt < self._config.max_retries:
                    _backoff(attempt)
                    continue
                raise

        raise last_exc  # type: ignore[misc]

    async def close(self) -> None:
        await self._client.aclose()


def _backoff(attempt: int) -> None:
    """Exponential backoff: 0.5s, 1s, 2s, ..."""
    delay = 0.5 * (2**attempt)
    time.sleep(min(delay, 10.0))
