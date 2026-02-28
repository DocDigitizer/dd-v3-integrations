"""Tests for DocDigitizerLoader."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from langchain_docdigitizer import DocDigitizerLoader
from docdigitizer.models import (
    Extraction,
    PageRange,
    ProcessingOutput,
    ProcessingResponse,
)


def _make_response(
    extractions=None, state="COMPLETED", trace_id="ABC1234", num_pages=2
):
    """Create a mock ProcessingResponse."""
    if extractions is None:
        extractions = [
            Extraction(
                document_type="Invoice",
                confidence=0.95,
                country_code="PT",
                pages=[1, 2],
                page_range=PageRange(start=1, end=2),
                data={"invoice_number": "INV-001", "total": "1000.00"},
                schema="Invoice_PT.json",
                model_source="llm",
            )
        ]
    return ProcessingResponse(
        state=state,
        trace_id=trace_id,
        num_pages=num_pages,
        pipeline="MainPipelineWithFile",
        output=ProcessingOutput(extractions=extractions),
    )


class TestDocDigitizerLoader:
    """Test DocDigitizerLoader basic behavior."""

    @patch("langchain_docdigitizer.document_loader.DocDigitizer")
    def test_load_single_file(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        loader = DocDigitizerLoader(api_key="test-key")
        docs = loader.load("invoice.pdf")

        assert len(docs) == 1
        mock_client.process.assert_called_once()

    @patch("langchain_docdigitizer.document_loader.DocDigitizer")
    def test_document_page_content_json(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        loader = DocDigitizerLoader(api_key="test-key")
        docs = loader.load("invoice.pdf")

        content = json.loads(docs[0].page_content)
        assert content["invoice_number"] == "INV-001"
        assert content["total"] == "1000.00"

    @patch("langchain_docdigitizer.document_loader.DocDigitizer")
    def test_document_page_content_text(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        loader = DocDigitizerLoader(api_key="test-key", content_format="text")
        docs = loader.load("invoice.pdf")

        assert "invoice_number: INV-001" in docs[0].page_content
        assert "total: 1000.00" in docs[0].page_content

    @patch("langchain_docdigitizer.document_loader.DocDigitizer")
    def test_document_metadata(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        loader = DocDigitizerLoader(api_key="test-key")
        docs = loader.load("invoice.pdf")

        meta = docs[0].metadata
        assert meta["document_type"] == "Invoice"
        assert meta["confidence"] == 0.95
        assert meta["country_code"] == "PT"
        assert meta["pages"] == [1, 2]
        assert meta["page_range"] == {"start": 1, "end": 2}
        assert meta["trace_id"] == "ABC1234"
        assert meta["source"] == "invoice.pdf"
        assert meta["schema"] == "Invoice_PT.json"
        assert meta["model_source"] == "llm"
        assert meta["pipeline"] == "MainPipelineWithFile"
        assert meta["num_pages"] == 2

    @patch("langchain_docdigitizer.document_loader.DocDigitizer")
    def test_multiple_extractions(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        extractions = [
            Extraction(
                document_type="Invoice",
                confidence=0.95,
                country_code="PT",
                pages=[1],
                page_range=PageRange(start=1, end=1),
                data={"invoice_number": "INV-001"},
            ),
            Extraction(
                document_type="Receipt",
                confidence=0.88,
                country_code="PT",
                pages=[2],
                page_range=PageRange(start=2, end=2),
                data={"receipt_number": "REC-001"},
            ),
        ]
        mock_client.process.return_value = _make_response(extractions=extractions)

        loader = DocDigitizerLoader(api_key="test-key")
        docs = loader.load("multi.pdf")

        assert len(docs) == 2
        assert docs[0].metadata["document_type"] == "Invoice"
        assert docs[1].metadata["document_type"] == "Receipt"

    @patch("langchain_docdigitizer.document_loader.DocDigitizer")
    def test_load_directory(self, mock_client_cls, tmp_path):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        # Create fake PDF files
        (tmp_path / "a.pdf").write_bytes(b"%PDF-fake")
        (tmp_path / "b.pdf").write_bytes(b"%PDF-fake")
        (tmp_path / "readme.txt").write_text("not a pdf")

        loader = DocDigitizerLoader(api_key="test-key")
        docs = loader.load(tmp_path)

        assert len(docs) == 2
        assert mock_client.process.call_count == 2

    @patch("langchain_docdigitizer.document_loader.DocDigitizer")
    def test_constructor_file_path(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        loader = DocDigitizerLoader(api_key="test-key", file_path="invoice.pdf")
        docs = loader.load()

        assert len(docs) == 1

    def test_no_file_path_raises(self):
        loader = DocDigitizerLoader(api_key="test-key")
        with pytest.raises(ValueError, match="file_path must be provided"):
            loader.load()

    @patch("langchain_docdigitizer.document_loader.DocDigitizer")
    def test_empty_extractions(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response(extractions=[])

        loader = DocDigitizerLoader(api_key="test-key")
        docs = loader.load("empty.pdf")

        assert len(docs) == 0

    @patch("langchain_docdigitizer.document_loader.DocDigitizer")
    def test_pipeline_passed_to_sdk(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        loader = DocDigitizerLoader(api_key="test-key", pipeline="CustomPipeline")
        loader.load("invoice.pdf")

        call_kwargs = mock_client.process.call_args
        assert call_kwargs[1]["pipeline"] == "CustomPipeline"

    @patch("langchain_docdigitizer.document_loader.DocDigitizer")
    def test_kv_content_format(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        loader = DocDigitizerLoader(api_key="test-key", content_format="kv")
        docs = loader.load("invoice.pdf")

        assert "invoice_number=INV-001" in docs[0].page_content

    @patch("langchain_docdigitizer.document_loader.DocDigitizer")
    def test_lazy_load_is_iterator(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        loader = DocDigitizerLoader(api_key="test-key")
        result = loader.lazy_load("invoice.pdf")

        # Should be an iterator, not a list
        assert hasattr(result, "__next__")
        doc = next(result)
        assert doc.metadata["document_type"] == "Invoice"
