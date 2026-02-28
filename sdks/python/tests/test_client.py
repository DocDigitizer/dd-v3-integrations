"""Unit tests for the synchronous client."""

from __future__ import annotations

import io
from unittest.mock import patch

import httpx
import pytest

from docdigitizer.client import DocDigitizer, _prepare_file
from docdigitizer.exceptions import AuthenticationError, ValidationError


class TestClientInit:
    def test_requires_api_key(self):
        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(ValueError, match="API key is required"):
                DocDigitizer()

    def test_api_key_from_arg(self):
        dd = DocDigitizer(api_key="test-key")
        assert dd._config.api_key == "test-key"
        dd.close()

    def test_api_key_from_env(self):
        with patch.dict("os.environ", {"DOCDIGITIZER_API_KEY": "env-key"}):
            dd = DocDigitizer()
            assert dd._config.api_key == "env-key"
            dd.close()

    def test_custom_base_url(self):
        dd = DocDigitizer(api_key="k", base_url="http://localhost:5000")
        assert dd._config.base_url == "http://localhost:5000"
        dd.close()

    def test_trailing_slash_stripped(self):
        dd = DocDigitizer(api_key="k", base_url="http://localhost:5000/")
        assert dd._config.base_url == "http://localhost:5000"
        dd.close()

    def test_context_manager(self):
        with DocDigitizer(api_key="k") as dd:
            assert dd._config.api_key == "k"


class TestPrepareFile:
    def test_from_string_path(self, tmp_path):
        pdf = tmp_path / "test.pdf"
        pdf.write_bytes(b"%PDF-1.4 test")
        name, f, mime = _prepare_file(str(pdf), None)
        assert name == "test.pdf"
        assert mime == "application/pdf"
        f.close()

    def test_from_path_object(self, tmp_path):
        pdf = tmp_path / "invoice.pdf"
        pdf.write_bytes(b"%PDF-1.4 test")
        name, f, mime = _prepare_file(pdf, None)
        assert name == "invoice.pdf"
        f.close()

    def test_from_bytes(self):
        name, data, mime = _prepare_file(b"%PDF-1.4 content", None)
        assert name == "document.pdf"
        assert data == b"%PDF-1.4 content"

    def test_from_bytes_with_filename(self):
        name, data, mime = _prepare_file(b"%PDF-1.4", "custom.pdf")
        assert name == "custom.pdf"

    def test_from_file_like(self):
        f = io.BytesIO(b"%PDF-1.4 test")
        f.name = "stream.pdf"
        name, obj, mime = _prepare_file(f, None)
        assert name == "stream.pdf"


class TestClientProcess:
    def test_process_success(self, api_key, successful_response_json):
        transport = httpx.MockTransport(
            lambda req: httpx.Response(
                200,
                json=successful_response_json,
                headers={
                    "Content-Type": "application/json",
                    "X-DD-TraceId": "ABC1234",
                    "X-DD-NumberPages": "2",
                },
            )
        )

        dd = DocDigitizer(api_key=api_key)
        dd._transport._client = httpx.Client(
            base_url="http://test",
            transport=transport,
        )

        result = dd.process(b"%PDF-1.4 test")
        assert result.state == "COMPLETED"
        assert result.trace_id == "ABC1234"
        assert len(result.extractions) == 1
        assert result.extractions[0].document_type == "Invoice"
        dd.close()

    def test_process_auth_error(self, api_key):
        transport = httpx.MockTransport(
            lambda req: httpx.Response(
                401,
                json={
                    "stateText": "ERROR",
                    "traceId": "UNA1234",
                    "messages": ["Invalid API key"],
                },
                headers={"Content-Type": "application/json"},
            )
        )

        dd = DocDigitizer(api_key=api_key)
        dd._transport._client = httpx.Client(
            base_url="http://test",
            transport=transport,
        )

        with pytest.raises(AuthenticationError) as exc_info:
            dd.process(b"%PDF-1.4 test")
        assert "Invalid API key" in str(exc_info.value)
        dd.close()

    def test_process_validation_error(self, api_key):
        transport = httpx.MockTransport(
            lambda req: httpx.Response(
                400,
                json={
                    "stateText": "ERROR",
                    "traceId": "VAL1234",
                    "messages": ["File must be a PDF document"],
                },
                headers={"Content-Type": "application/json"},
            )
        )

        dd = DocDigitizer(api_key=api_key)
        dd._transport._client = httpx.Client(
            base_url="http://test",
            transport=transport,
        )

        with pytest.raises(ValidationError):
            dd.process(b"not a pdf")
        dd.close()


class TestClientHealthCheck:
    def test_health_check_success(self, api_key):
        transport = httpx.MockTransport(
            lambda req: httpx.Response(
                200,
                text="I am alive",
                headers={"Content-Type": "text/plain"},
            )
        )

        dd = DocDigitizer(api_key=api_key)
        dd._transport._client = httpx.Client(
            base_url="http://test",
            transport=transport,
        )

        result = dd.health_check()
        assert result == "I am alive"
        dd.close()
