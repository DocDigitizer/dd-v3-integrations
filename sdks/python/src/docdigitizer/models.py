"""Typed response models for the DocDigitizer API.

All models are dataclasses that map directly to the OpenAPI schema definitions
in openapi/sync.openapi.yaml. Field names use snake_case (Python convention)
and are mapped from the API's PascalCase.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


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
    page_range: Optional[PageRange]
    data: Dict[str, Any]
    """The extracted field values. Structure varies by document type."""


@dataclass
class ProcessingOutput:
    """Container for extraction results."""

    extractions: List[Extraction] = field(default_factory=list)


@dataclass
class ProcessingResponse:
    """Response returned when a document is processed.

    Corresponds to the ProcessingResponse schema in the OpenAPI spec.
    """

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
    page_range_raw = raw.get("pageRange")
    page_range = None
    if page_range_raw and isinstance(page_range_raw, dict):
        page_range = PageRange(
            start=page_range_raw.get("start", 0),
            end=page_range_raw.get("end", 0),
        )

    return Extraction(
        document_type=raw.get("documentType", ""),
        confidence=raw.get("confidence", 0.0),
        country_code=raw.get("countryCode", ""),
        page_range=page_range,
        data=raw.get("extraction", {}),
    )


def _parse_output(raw: Any) -> Optional[ProcessingOutput]:
    if not raw or not isinstance(raw, dict):
        return None
    extractions_raw = raw.get("extractions", [])
    extractions = [_parse_extraction(e) for e in extractions_raw if isinstance(e, dict)]
    return ProcessingOutput(extractions=extractions)


def parse_response(data: Dict[str, Any]) -> ProcessingResponse:
    """Parse a raw JSON dict into a ProcessingResponse."""
    return ProcessingResponse(
        state=data.get("StateText", ""),
        trace_id=data.get("TraceId", ""),
        pipeline=data.get("Pipeline"),
        num_pages=data.get("NumberPages"),
        output=_parse_output(data.get("Output")),
        timers=data.get("Timers"),
        messages=data.get("Messages"),
    )
