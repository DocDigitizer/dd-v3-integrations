"""DocDigitizer Python SDK.

Official Python client for the DocDigitizer document processing API.

Usage::

    from docdigitizer import DocDigitizer

    dd = DocDigitizer(api_key="your-api-key")
    result = dd.process("invoice.pdf")
    print(result.extractions[0].document_type)  # "Invoice"
"""

from docdigitizer._version import __version__
from docdigitizer.async_client import AsyncDocDigitizer
from docdigitizer.client import DocDigitizer
from docdigitizer.exceptions import (
    AuthenticationError,
    DocDigitizerError,
    RateLimitError,
    ServerError,
    ServiceUnavailableError,
    TimeoutError,
    ValidationError,
)
from docdigitizer.models import (
    Extraction,
    PageRange,
    ProcessingOutput,
    ProcessingResponse,
)

__all__ = [
    "__version__",
    "DocDigitizer",
    "AsyncDocDigitizer",
    "ProcessingResponse",
    "ProcessingOutput",
    "Extraction",
    "PageRange",
    "DocDigitizerError",
    "AuthenticationError",
    "ValidationError",
    "RateLimitError",
    "ServerError",
    "ServiceUnavailableError",
    "TimeoutError",
]
