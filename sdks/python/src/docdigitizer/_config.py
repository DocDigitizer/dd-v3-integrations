"""Client configuration with environment variable overrides."""

from __future__ import annotations

import os
from typing import Optional

DEFAULT_BASE_URL = "https://api.docdigitizer.com/v3/docingester"
DEFAULT_TIMEOUT = 300.0  # seconds
DEFAULT_MAX_RETRIES = 3


class ClientConfig:
    """Configuration for the DocDigitizer client.

    Values are resolved in order: explicit argument > environment variable > default.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        max_retries: Optional[int] = None,
    ) -> None:
        self.api_key = api_key or os.environ.get("DOCDIGITIZER_API_KEY", "")
        if not self.api_key:
            raise ValueError("API key is required. Pass api_key= or set DOCDIGITIZER_API_KEY.")

        self.base_url = (
            base_url or os.environ.get("DOCDIGITIZER_BASE_URL") or DEFAULT_BASE_URL
        ).rstrip("/")

        self.timeout = timeout if timeout is not None else DEFAULT_TIMEOUT
        self.max_retries = max_retries if max_retries is not None else DEFAULT_MAX_RETRIES
