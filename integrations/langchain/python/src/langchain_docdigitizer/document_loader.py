"""DocDigitizer document loader for LangChain."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterator, List, Optional, Union

from langchain_core.document_loaders.base import BaseLoader
from langchain_core.documents import Document

from docdigitizer import DocDigitizer
from docdigitizer.models import Extraction, ProcessingResponse


class DocDigitizerLoader(BaseLoader):
    """Load documents using the DocDigitizer document processing API.

    Each PDF is processed via DocDigitizer and each extraction is returned
    as a separate LangChain Document with extracted fields as page_content
    and document metadata (type, confidence, country, pages) in metadata.

    Usage::

        loader = DocDigitizerLoader(api_key="dd_live_...")
        docs = loader.load("invoice.pdf")
        # Or load all PDFs from a directory:
        loader = DocDigitizerLoader(api_key="dd_live_...", file_path="invoices/")
        docs = loader.load()

    Args:
        api_key: DocDigitizer API key. Falls back to DOCDIGITIZER_API_KEY env var.
        base_url: API base URL override.
        timeout: Request timeout in seconds.
        max_retries: Max retries on transient errors.
        file_path: Path to a PDF file or directory of PDFs.
        pipeline: Pipeline name for processing.
        content_format: Format for page_content — "json" (default), "text", or "kv".
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        max_retries: Optional[int] = None,
        file_path: Optional[Union[str, Path]] = None,
        pipeline: Optional[str] = None,
        content_format: str = "json",
    ) -> None:
        self._client = DocDigitizer(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
        )
        self._file_path = Path(file_path) if file_path else None
        self._pipeline = pipeline
        self._content_format = content_format

    def load(self, file_path: Optional[Union[str, Path]] = None) -> List[Document]:
        """Load and process PDF documents.

        Args:
            file_path: Path to a PDF or directory. Overrides constructor file_path.

        Returns:
            List of Document objects, one per extraction.
        """
        return list(self.lazy_load(file_path))

    def lazy_load(
        self, file_path: Optional[Union[str, Path]] = None
    ) -> Iterator[Document]:
        """Lazily load and process PDF documents.

        Args:
            file_path: Path to a PDF or directory. Overrides constructor file_path.

        Yields:
            Document objects, one per extraction found in each PDF.
        """
        path = Path(file_path) if file_path else self._file_path
        if path is None:
            raise ValueError(
                "file_path must be provided either in the constructor or in load()/lazy_load()."
            )

        if path.is_dir():
            pdf_files = sorted(path.glob("*.pdf"))
            if not pdf_files:
                return
            for pdf_file in pdf_files:
                yield from self._process_file(pdf_file)
        else:
            yield from self._process_file(path)

    def _process_file(self, file_path: Path) -> Iterator[Document]:
        """Process a single PDF file and yield Documents."""
        kwargs = {}
        if self._pipeline:
            kwargs["pipeline"] = self._pipeline

        response: ProcessingResponse = self._client.process(file_path, **kwargs)

        for extraction in response.extractions:
            yield Document(
                page_content=self._format_content(extraction),
                metadata=self._build_metadata(extraction, response, file_path),
            )

    def _format_content(self, extraction: Extraction) -> str:
        """Format extraction data as page_content string."""
        if self._content_format == "text":
            lines = []
            for key, value in extraction.data.items():
                lines.append(f"{key}: {value}")
            return "\n".join(lines)
        elif self._content_format == "kv":
            lines = []
            for key, value in extraction.data.items():
                lines.append(f"{key}={value}")
            return "\n".join(lines)
        else:
            # Default: json
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
