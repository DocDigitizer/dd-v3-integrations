"""Shared test fixtures for the DocDigitizer Python SDK."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

# Path to the repo root (two levels up from tests/)
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
OPENAPI_SPEC_PATH = REPO_ROOT / "openapi" / "sync.openapi.yaml"
SDK_MANIFEST_PATH = Path(__file__).resolve().parent.parent / "sdk-manifest.yaml"


@pytest.fixture
def api_key():
    return "test-key-for-unit-tests"


@pytest.fixture
def successful_response_json():
    """A realistic successful API response matching the OpenAPI schema."""
    return {
        "StateText": "COMPLETED",
        "TraceId": "ABC1234",
        "Pipeline": "MainPipelineWithOCR",
        "NumberPages": 2,
        "Output": {
            "extractions": [
                {
                    "documentType": "Invoice",
                    "confidence": 0.95,
                    "countryCode": "PT",
                    "pageRange": {"start": 1, "end": 2},
                    "extraction": {
                        "invoiceNumber": "INV-2024-001",
                        "invoiceDate": "2024-01-15",
                        "vendorName": "Acme Corp",
                        "vendorNIF": "123456789",
                        "totalAmount": 1250.00,
                        "currency": "EUR",
                        "lineItems": [
                            {
                                "description": "Product A",
                                "quantity": 2,
                                "unitPrice": 500.00,
                                "total": 1000.00,
                            }
                        ],
                    },
                }
            ]
        },
        "Timers": {"DocIngester": {"total": 2345.67}},
        "Messages": ["Document processed successfully"],
    }


@pytest.fixture
def error_response_json():
    """A realistic error API response."""
    return {
        "StateText": "ERROR",
        "TraceId": "ERR9876",
        "Timers": {"DocIngester_Total": 45.23},
        "Messages": ["File must be a PDF document"],
    }


@pytest.fixture
def live_api_key():
    """API key for integration tests. Skips if not set."""
    key = os.environ.get("DD_API_KEY")
    if not key:
        pytest.skip("DD_API_KEY not set — skipping integration test")
    return key
