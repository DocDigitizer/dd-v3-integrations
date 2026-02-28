"""DocDigitizer exception hierarchy.

Maps HTTP status codes to specific exception types for structured error handling.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


class DocDigitizerError(Exception):
    """Base exception for all DocDigitizer SDK errors."""

    def __init__(
        self,
        message: str,
        *,
        status_code: Optional[int] = None,
        trace_id: Optional[str] = None,
        messages: Optional[List[str]] = None,
        timers: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.status_code = status_code
        self.trace_id = trace_id
        self.messages = messages or []
        self.timers = timers
        super().__init__(message)


class AuthenticationError(DocDigitizerError):
    """Raised when the API key is invalid or missing (HTTP 401)."""

    pass


class ValidationError(DocDigitizerError):
    """Raised when the request is invalid (HTTP 400).

    Common causes: missing required fields, invalid PDF, bad UUID format.
    """

    pass


class RateLimitError(DocDigitizerError):
    """Raised when rate limits are exceeded (HTTP 429)."""

    pass


class ServerError(DocDigitizerError):
    """Raised when the server encounters an internal error (HTTP 500)."""

    pass


class ServiceUnavailableError(DocDigitizerError):
    """Raised when a downstream service is unreachable (HTTP 503)."""

    pass


class TimeoutError(DocDigitizerError):
    """Raised when processing takes too long (HTTP 504)."""

    pass


_STATUS_CODE_MAP = {
    400: ValidationError,
    401: AuthenticationError,
    429: RateLimitError,
    500: ServerError,
    503: ServiceUnavailableError,
    504: TimeoutError,
}


def raise_for_status(
    status_code: int,
    *,
    trace_id: Optional[str] = None,
    messages: Optional[List[str]] = None,
    timers: Optional[Dict[str, Any]] = None,
) -> None:
    """Raise the appropriate exception for a non-2xx status code."""
    if status_code < 400:
        return

    exc_class = _STATUS_CODE_MAP.get(status_code, DocDigitizerError)
    msg = "; ".join(messages) if messages else f"HTTP {status_code}"
    raise exc_class(
        msg,
        status_code=status_code,
        trace_id=trace_id,
        messages=messages,
        timers=timers,
    )
