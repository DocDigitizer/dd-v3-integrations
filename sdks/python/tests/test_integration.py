"""Integration tests that call the live DocDigitizer API.

These tests require a valid API key set in DD_API_KEY environment variable.
They are skipped in CI unless the secret is configured.

Run manually:
    DD_API_KEY=your-key pytest tests/test_integration.py -v
"""

from __future__ import annotations

import pytest

from docdigitizer import DocDigitizer, ProcessingResponse


@pytest.mark.integration
class TestLiveAPI:
    def test_health_check(self, live_api_key):
        dd = DocDigitizer(api_key=live_api_key)
        result = dd.health_check()
        assert "alive" in result.lower()
        dd.close()

    def test_process_pdf(self, live_api_key, tmp_path):
        """Process a minimal valid PDF and check the response structure."""
        # Create a minimal PDF for testing
        minimal_pdf = (
            b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
            b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n"
            b"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n"
            b"0000000058 00000 n \n0000000115 00000 n \n"
            b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
        )

        pdf_path = tmp_path / "test.pdf"
        pdf_path.write_bytes(minimal_pdf)

        dd = DocDigitizer(api_key=live_api_key)
        result = dd.process(str(pdf_path))

        assert isinstance(result, ProcessingResponse)
        assert result.trace_id  # should always have a trace ID
        assert result.state in ("COMPLETED", "ERROR", "PROCESSING")
        dd.close()
