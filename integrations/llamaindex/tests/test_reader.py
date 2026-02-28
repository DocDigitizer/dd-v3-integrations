"""Tests for DocDigitizerReader."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from llama_index.readers.docdigitizer import DocDigitizerReader
from docdigitizer.models import (
    Extraction,
    PageRange,
    ProcessingOutput,
    ProcessingResponse,
)


def _make_response(
    extractions=None, state="COMPLETED", trace_id="ABC1234", num_pages=2
):
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


class TestDocDigitizerReader:
    @patch("llama_index.readers.docdigitizer.base.DocDigitizer")
    def test_load_single_file(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        reader = DocDigitizerReader(api_key="test-key")
        docs = reader.load_data(file_path="invoice.pdf")

        assert len(docs) == 1
        mock_client.process.assert_called_once()

    @patch("llama_index.readers.docdigitizer.base.DocDigitizer")
    def test_document_text_json(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        reader = DocDigitizerReader(api_key="test-key")
        docs = reader.load_data(file_path="invoice.pdf")

        content = json.loads(docs[0].text)
        assert content["invoice_number"] == "INV-001"
        assert content["total"] == "1000.00"

    @patch("llama_index.readers.docdigitizer.base.DocDigitizer")
    def test_document_text_format(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        reader = DocDigitizerReader(api_key="test-key", content_format="text")
        docs = reader.load_data(file_path="invoice.pdf")

        assert "invoice_number: INV-001" in docs[0].text

    @patch("llama_index.readers.docdigitizer.base.DocDigitizer")
    def test_document_metadata(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        reader = DocDigitizerReader(api_key="test-key")
        docs = reader.load_data(file_path="invoice.pdf")

        meta = docs[0].metadata
        assert meta["document_type"] == "Invoice"
        assert meta["confidence"] == 0.95
        assert meta["country_code"] == "PT"
        assert meta["pages"] == [1, 2]
        assert meta["trace_id"] == "ABC1234"
        assert meta["source"] == "invoice.pdf"

    @patch("llama_index.readers.docdigitizer.base.DocDigitizer")
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

        reader = DocDigitizerReader(api_key="test-key")
        docs = reader.load_data(file_path="multi.pdf")

        assert len(docs) == 2
        assert docs[0].metadata["document_type"] == "Invoice"
        assert docs[1].metadata["document_type"] == "Receipt"

    @patch("llama_index.readers.docdigitizer.base.DocDigitizer")
    def test_load_directory(self, mock_client_cls, tmp_path):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        (tmp_path / "a.pdf").write_bytes(b"%PDF-fake")
        (tmp_path / "b.pdf").write_bytes(b"%PDF-fake")
        (tmp_path / "readme.txt").write_text("not a pdf")

        reader = DocDigitizerReader(api_key="test-key")
        docs = reader.load_data(file_path=tmp_path)

        assert len(docs) == 2
        assert mock_client.process.call_count == 2

    def test_no_file_path_raises(self):
        reader = DocDigitizerReader(api_key="test-key")
        with pytest.raises(ValueError, match="file_path is required"):
            reader.load_data()

    @patch("llama_index.readers.docdigitizer.base.DocDigitizer")
    def test_empty_extractions(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response(extractions=[])

        reader = DocDigitizerReader(api_key="test-key")
        docs = reader.load_data(file_path="empty.pdf")

        assert len(docs) == 0

    @patch("llama_index.readers.docdigitizer.base.DocDigitizer")
    def test_pipeline_passed_to_sdk(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.process.return_value = _make_response()

        reader = DocDigitizerReader(api_key="test-key", pipeline="CustomPipeline")
        reader.load_data(file_path="invoice.pdf")

        call_kwargs = mock_client.process.call_args
        assert call_kwargs[1]["pipeline"] == "CustomPipeline"

    def test_is_remote_flag(self):
        reader = DocDigitizerReader(api_key="test-key")
        assert reader.is_remote is True
