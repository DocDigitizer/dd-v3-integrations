"""DocDigitizer reader for LlamaIndex."""

from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional, Union

from llama_index.core.readers.base import BasePydanticReader
from llama_index.core.schema import Document

from docdigitizer import DocDigitizer
from docdigitizer.models import Extraction, ProcessingResponse


class DocDigitizerReader(BasePydanticReader):
    """Read documents using the DocDigitizer document processing API.

    Each PDF is processed via DocDigitizer and each extraction is returned
    as a separate LlamaIndex Document with extracted fields as text
    and document metadata (type, confidence, country, pages) in metadata.

    Usage::

        reader = DocDigitizerReader(api_key="dd_live_...")
        documents = reader.load_data(file_path="invoice.pdf")

    Args:
        api_key: DocDigitizer API key. Falls back to DOCDIGITIZER_API_KEY env var.
        base_url: API base URL override.
        timeout: Request timeout in seconds.
        max_retries: Max retries on transient errors.
        pipeline: Pipeline name for processing.
        content_format: Format for text content — "json" (default), "text", or "kv".
    """

    is_remote: bool = True

    api_key: Optional[str] = None
    base_url: Optional[str] = None
    timeout: Optional[float] = None
    max_retries: Optional[int] = None
    pipeline: Optional[str] = None
    content_format: str = "json"

    def load_data(
        self,
        file_path: Optional[Union[str, Path]] = None,
        **kwargs,
    ) -> List[Document]:
        """Load and process PDF documents.

        Args:
            file_path: Path to a PDF file or directory of PDFs.

        Returns:
            List of LlamaIndex Document objects, one per extraction.
        """
        if file_path is None:
            raise ValueError("file_path is required.")

        client = DocDigitizer(
            api_key=self.api_key,
            base_url=self.base_url,
            timeout=self.timeout,
            max_retries=self.max_retries,
        )

        path = Path(file_path)
        documents: List[Document] = []

        if path.is_dir():
            for pdf_file in sorted(path.glob("*.pdf")):
                documents.extend(self._process_file(client, pdf_file))
        else:
            documents.extend(self._process_file(client, path))

        return documents

    def _process_file(
        self, client: DocDigitizer, file_path: Path
    ) -> List[Document]:
        """Process a single PDF and return Documents."""
        kwargs = {}
        if self.pipeline:
            kwargs["pipeline"] = self.pipeline

        response: ProcessingResponse = client.process(file_path, **kwargs)

        documents = []
        for extraction in response.extractions:
            documents.append(
                Document(
                    text=self._format_content(extraction),
                    metadata=self._build_metadata(extraction, response, file_path),
                )
            )
        return documents

    def _format_content(self, extraction: Extraction) -> str:
        """Format extraction data as text."""
        if self.content_format == "text":
            lines = []
            for key, value in extraction.data.items():
                lines.append(f"{key}: {value}")
            return "\n".join(lines)
        elif self.content_format == "kv":
            lines = []
            for key, value in extraction.data.items():
                lines.append(f"{key}={value}")
            return "\n".join(lines)
        else:
            return json.dumps(extraction.data, ensure_ascii=False, default=str)

    def _build_metadata(
        self,
        extraction: Extraction,
        response: ProcessingResponse,
        file_path: Path,
    ) -> dict:
        """Build metadata dict for a Document."""
        metadata = {
            "source": str(file_path),
            "document_type": extraction.document_type,
            "confidence": extraction.confidence,
            "country_code": extraction.country_code,
            "pages": extraction.pages,
            "trace_id": response.trace_id,
        }
        if extraction.page_range:
            metadata["page_range"] = {
                "start": extraction.page_range.start,
                "end": extraction.page_range.end,
            }
        if extraction.schema:
            metadata["schema"] = extraction.schema
        if extraction.model_source:
            metadata["model_source"] = extraction.model_source
        if response.pipeline:
            metadata["pipeline"] = response.pipeline
        if response.num_pages:
            metadata["num_pages"] = response.num_pages
        return metadata
