"""Unit tests for response model parsing."""

from docdigitizer.models import Extraction, PageRange, parse_response


class TestParseResponse:
    def test_completed_response(self, successful_response_json):
        result = parse_response(successful_response_json)

        assert result.state == "COMPLETED"
        assert result.is_completed is True
        assert result.is_error is False
        assert result.trace_id == "ABC1234"
        assert result.pipeline == "MainPipelineWithOCR"
        assert result.num_pages == 2
        assert result.messages == ["Document processed successfully"]
        assert result.timers is not None

    def test_extractions(self, successful_response_json):
        result = parse_response(successful_response_json)

        assert len(result.extractions) == 1
        ext = result.extractions[0]
        assert isinstance(ext, Extraction)
        assert ext.document_type == "Invoice"
        assert ext.confidence == 0.95
        assert ext.country_code == "PT"
        assert ext.data["invoiceNumber"] == "INV-2024-001"
        assert ext.data["totalAmount"] == 1250.00
        assert len(ext.data["lineItems"]) == 1

    def test_page_range(self, successful_response_json):
        result = parse_response(successful_response_json)
        ext = result.extractions[0]

        assert isinstance(ext.page_range, PageRange)
        assert ext.page_range.start == 1
        assert ext.page_range.end == 2

    def test_error_response(self, error_response_json):
        result = parse_response(error_response_json)

        assert result.state == "ERROR"
        assert result.is_error is True
        assert result.is_completed is False
        assert result.trace_id == "ERR9876"
        assert result.messages == ["File must be a PDF document"]

    def test_empty_output(self):
        result = parse_response({"StateText": "COMPLETED", "TraceId": "X"})

        assert result.extractions == []
        assert result.output is None

    def test_null_fields(self):
        data = {
            "StateText": "COMPLETED",
            "TraceId": "X",
            "Pipeline": None,
            "NumberPages": None,
            "Output": None,
            "Timers": None,
            "Messages": None,
        }
        result = parse_response(data)

        assert result.pipeline is None
        assert result.num_pages is None
        assert result.timers is None
        assert result.messages is None

    def test_multiple_extractions(self):
        data = {
            "StateText": "COMPLETED",
            "TraceId": "MULTI1",
            "Output": {
                "extractions": [
                    {
                        "documentType": "Invoice",
                        "confidence": 0.9,
                        "countryCode": "PT",
                        "pageRange": {"start": 1, "end": 2},
                        "extraction": {"invoiceNumber": "INV-001"},
                    },
                    {
                        "documentType": "Receipt",
                        "confidence": 0.85,
                        "countryCode": "ES",
                        "pageRange": {"start": 3, "end": 3},
                        "extraction": {"receiptNumber": "REC-001"},
                    },
                ]
            },
        }
        result = parse_response(data)
        assert len(result.extractions) == 2
        assert result.extractions[0].document_type == "Invoice"
        assert result.extractions[1].document_type == "Receipt"
