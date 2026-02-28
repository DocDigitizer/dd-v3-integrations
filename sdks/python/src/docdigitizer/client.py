"""Synchronous DocDigitizer client."""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any, BinaryIO, Dict, Optional, Union

from docdigitizer._config import ClientConfig
from docdigitizer._http import SyncTransport
from docdigitizer.exceptions import raise_for_status
from docdigitizer.models import ProcessingResponse, parse_response


class DocDigitizer:
    """Synchronous client for the DocDigitizer document processing API.

    Usage::

        dd = DocDigitizer(api_key="your-api-key")
        result = dd.process("invoice.pdf")
        print(result.extractions[0].document_type)  # "Invoice"

    Args:
        api_key: Your DocDigitizer API key. Falls back to DOCDIGITIZER_API_KEY env var.
        base_url: API base URL. Defaults to https://apix.docdigitizer.com/sync.
        timeout: Request timeout in seconds (default 300).
        max_retries: Max retries on 5xx/429 errors (default 3).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        max_retries: Optional[int] = None,
    ) -> None:
        self._config = ClientConfig(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
        )
        self._transport = SyncTransport(self._config)

    def process(
        self,
        file: Union[str, Path, bytes, BinaryIO],
        *,
        id: Optional[str] = None,
        context_id: Optional[str] = None,
        pipeline: Optional[str] = None,
        request_token: Optional[str] = None,
        filename: Optional[str] = None,
    ) -> ProcessingResponse:
        """Upload and process a PDF document.

        Args:
            file: PDF to process. Accepts a file path (str/Path), raw bytes,
                  or a file-like object.
            id: Document UUID. Auto-generated if not provided.
            context_id: Context UUID for grouping. Auto-generated if not provided.
            pipeline: Pipeline name (e.g. "MainPipelineWithOCR").
            request_token: Trace token (max 7 chars). Auto-generated if not provided.
            filename: Filename hint when passing bytes or file-like objects.

        Returns:
            ProcessingResponse with extraction results.

        Raises:
            AuthenticationError: Invalid or missing API key (401).
            ValidationError: Invalid request parameters (400).
            ServerError: Internal server error (500).
            TimeoutError: Processing timeout (504).
            ServiceUnavailableError: Downstream service unreachable (503).
        """
        file_tuple = _prepare_file(file, filename)

        data: Dict[str, Any] = {
            "id": id or str(uuid.uuid4()),
            "contextID": context_id or str(uuid.uuid4()),
        }
        if pipeline:
            data["pipelineIdentifier"] = pipeline
        if request_token:
            data["requestToken"] = request_token

        status, body, dd_headers = self._transport.request(
            "POST",
            "/",
            data=data,
            files={"files": file_tuple},
        )

        if status >= 400:
            raise_for_status(
                status,
                trace_id=body.get("TraceId") or dd_headers.get("trace_id"),
                messages=body.get("Messages"),
                timers=body.get("Timers"),
            )

        return parse_response(body)

    def health_check(self) -> str:
        """Check if the API is available.

        Returns:
            The health check response string (e.g. "I am alive").

        Raises:
            ServiceUnavailableError: If the service is unavailable.
        """
        status, body, _ = self._transport.request("GET", "/")
        if status >= 400:
            raise_for_status(status)
        return body.get("_text", "")

    def close(self) -> None:
        """Close the underlying HTTP connection."""
        self._transport.close()

    def __enter__(self) -> "DocDigitizer":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()


def _prepare_file(
    file: Union[str, Path, bytes, BinaryIO],
    filename: Optional[str],
) -> tuple:
    """Convert various file input types to an httpx-compatible upload tuple."""
    if isinstance(file, (str, Path)):
        path = Path(file)
        return (path.name, open(path, "rb"), "application/pdf")
    elif isinstance(file, bytes):
        name = filename or "document.pdf"
        return (name, file, "application/pdf")
    else:
        # File-like object
        name = filename or getattr(file, "name", "document.pdf")
        if isinstance(name, (Path,)):
            name = name.name
        return (name, file, "application/pdf")
