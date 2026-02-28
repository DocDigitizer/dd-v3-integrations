"""Unit tests for response model parsing."""

from docdigitizer.models import Extraction, PageRange, parse_response


class TestParseResponseCamelCase:
    """Tests with camelCase (actual API format)."""

    def test_completed_response(self, successful_response_json):
        result = parse_response(successful_response_json)

        assert result.state == "COMPLETED"
        assert result.is_completed is True
        assert result.is_error is False
        assert result.trace_id == "ABC1234"
        assert result.pipeline == "MainPipelineWithOCR"
        assert result.num_pages == 2
        assert result.timers is not None

    def test_extractions(self, successful_response_json):
        result = parse_response(successful_response_json)

        assert len(result.extractions) == 1
        ext = result.extractions[0]
        assert isinstance(ext, Extraction)
        assert ext.document_type == "Invoice"
        assert ext.confidence == 0.95
        assert ext.country_code == "PT"
        assert ext.data["DocumentNumber"] == "INV-2024-001"
        assert ext.data["TotalAmount"] == 1250.00
        assert ext.schema == "Invoice_PT.json"
        assert ext.model_source == "llm"

    def test_pages_and_page_range(self, successful_response_json):
        result = parse_response(successful_response_json)
        ext = result.extractions[0]

        assert ext.pages == [1, 2]
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


class TestParseResponsePascalCase:
    """Tests with PascalCase (OpenAPI spec format) — backward compatibility."""

    def test_completed_response(self, successful_response_json_pascal):
        result = parse_response(successful_response_json_pascal)

        assert result.state == "COMPLETED"
        assert result.trace_id == "ABC1234"
        assert result.pipeline == "MainPipelineWithOCR"
        assert result.num_pages == 2
        assert result.messages == ["Document processed successfully"]

    def test_extractions_pascal(self, successful_response_json_pascal):
        result = parse_response(successful_response_json_pascal)

        assert len(result.extractions) == 1
        ext = result.extractions[0]
        assert ext.document_type == "Invoice"
        assert ext.country_code == "PT"

    def test_page_range_from_object(self, successful_response_json_pascal):
        result = parse_response(successful_response_json_pascal)
        ext = result.extractions[0]

        assert isinstance(ext.page_range, PageRange)
        assert ext.page_range.start == 1
        assert ext.page_range.end == 2

    def test_error_response_pascal(self, error_response_json_pascal):
        result = parse_response(error_response_json_pascal)

        assert result.state == "ERROR"
        assert result.trace_id == "ERR9876"
        assert result.messages == ["File must be a PDF document"]


class TestParseResponseEdgeCases:
    def test_empty_output(self):
        result = parse_response({"stateText": "COMPLETED", "traceId": "X"})

        assert result.extractions == []
        assert result.output is None

    def test_null_fields(self):
        data = {
            "stateText": "COMPLETED",
            "traceId": "X",
            "pipeline": None,
            "numberPages": None,
            "output": None,
            "timers": None,
            "messages": None,
        }
        result = parse_response(data)

        assert result.pipeline is None
        assert result.num_pages is None
        assert result.timers is None
        assert result.messages is None

    def test_multiple_extractions(self):
        data = {
            "stateText": "COMPLETED",
            "traceId": "MULTI1",
            "output": {
                "extractions": [
                    {
                        "docType": "Invoice",
                        "confidence": 0.9,
                        "country": "PT",
                        "pages": [1, 2],
                        "extraction": {"DocumentNumber": "INV-001"},
                    },
                    {
                        "docType": "Receipt",
                        "confidence": 0.85,
                        "country": "ES",
                        "pages": [3],
                        "extraction": {"DocumentNumber": "REC-001"},
                    },
                ]
            },
        }
        result = parse_response(data)
        assert len(result.extractions) == 2
        assert result.extractions[0].document_type == "Invoice"
        assert result.extractions[1].document_type == "Receipt"
        assert result.extractions[1].pages == [3]
        assert result.extractions[1].page_range.start == 3
        assert result.extractions[1].page_range.end == 3
