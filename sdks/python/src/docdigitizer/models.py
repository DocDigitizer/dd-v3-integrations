"""Typed response models for the DocDigitizer API.

All models are dataclasses that map directly to the API response format.
Field names use snake_case (Python convention).

The API returns camelCase keys (stateText, traceId, etc.). The parser handles
both camelCase (actual API) and PascalCase (OpenAPI spec) for resilience.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


def _get(data: Dict[str, Any], camel: str, pascal: str, default: Any = None) -> Any:
    """Get a value trying camelCase first (actual API), then PascalCase (spec)."""
    if camel in data:
        return data[camel]
    return data.get(pascal, default)


@dataclass
class PageRange:
    """Page range within the PDF where a document was found."""

    start: int
    end: int


@dataclass
class Extraction:
    """Extracted data from a single document segment within the PDF."""

    document_type: str
    confidence: float
    country_code: str
    pages: List[int]
    """Page numbers where this document was found (1-indexed)."""
    page_range: Optional[PageRange]
    data: Dict[str, Any]
    """The extracted field values. Structure varies by document type."""
    schema: Optional[str] = None
    """Schema used for extraction (e.g. 'Invoice_PT.json')."""
    model_source: Optional[str] = None
    """Model source used for extraction (e.g. 'llm')."""


@dataclass
class ProcessingOutput:
    """Container for extraction results."""

    extractions: List[Extraction] = field(default_factory=list)


@dataclass
class ProcessingResponse:
    """Response returned when a document is processed."""

    state: str
    """Processing state: COMPLETED, PROCESSING, or ERROR."""

    trace_id: str
    """Unique 7-character trace identifier."""

    pipeline: Optional[str] = None
    num_pages: Optional[int] = None
    output: Optional[ProcessingOutput] = None
    timers: Optional[Dict[str, Any]] = None
    messages: Optional[List[str]] = None

    @property
    def is_completed(self) -> bool:
        return self.state == "COMPLETED"

    @property
    def is_error(self) -> bool:
        return self.state == "ERROR"

    @property
    def extractions(self) -> List[Extraction]:
        """Shortcut to output.extractions."""
        if self.output is None:
            return []
        return self.output.extractions


def _parse_extraction(raw: Dict[str, Any]) -> Extraction:
    # Pages: API returns "pages" as an array [1, 2], spec says "pageRange" as object
    pages = raw.get("pages", [])
    page_range_raw = raw.get("pageRange")
    page_range = None

    if page_range_raw and isinstance(page_range_raw, dict):
        page_range = PageRange(
            start=page_range_raw.get("start", 0),
            end=page_range_raw.get("end", 0),
        )
    elif pages:
        # Derive page_range from pages array for convenience
        page_range = PageRange(start=min(pages), end=max(pages))

    return Extraction(
        document_type=_get(raw, "docType", "documentType", ""),
        confidence=raw.get("confidence", 0.0),
        country_code=_get(raw, "country", "countryCode", ""),
        pages=pages,
        page_range=page_range,
        data=raw.get("extraction", {}),
        schema=raw.get("schema"),
        model_source=_get(raw, "modelSource", "modelSource"),
    )


def _parse_output(raw: Any) -> Optional[ProcessingOutput]:
    if not raw or not isinstance(raw, dict):
        return None
    extractions_raw = raw.get("extractions", [])
    extractions = [_parse_extraction(e) for e in extractions_raw if isinstance(e, dict)]
    return ProcessingOutput(extractions=extractions)


def parse_response(data: Dict[str, Any]) -> ProcessingResponse:
    """Parse a raw JSON dict into a ProcessingResponse.

    Handles both camelCase (actual API response) and PascalCase (OpenAPI spec).
    """
    return ProcessingResponse(
        state=_get(data, "stateText", "StateText", ""),
        trace_id=_get(data, "traceId", "TraceId", ""),
        pipeline=_get(data, "pipeline", "Pipeline"),
        num_pages=_get(data, "numberPages", "NumberPages"),
        output=_parse_output(_get(data, "output", "Output")),
        timers=_get(data, "timers", "Timers"),
        messages=_get(data, "messages", "Messages"),
    )
