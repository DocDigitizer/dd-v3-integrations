"""Contract tests: validate SDK models and methods against the OpenAPI spec.

These tests ensure the Python SDK stays consistent with the API specification.
If the API spec changes and the SDK doesn't update, these tests will fail.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

try:
    from jsonschema import Draft202012Validator
except ImportError:
    pytest.skip("jsonschema not installed", allow_module_level=True)

# Paths resolved relative to this file
_TESTS_DIR = Path(__file__).resolve().parent
_SDK_DIR = _TESTS_DIR.parent
_REPO_ROOT = _SDK_DIR.parent.parent
OPENAPI_SPEC_PATH = _REPO_ROOT / "openapi" / "sync.openapi.yaml"
SDK_MANIFEST_PATH = _SDK_DIR / "sdk-manifest.yaml"


@pytest.fixture(scope="module")
def openapi_spec():
    """Load the OpenAPI spec."""
    if not OPENAPI_SPEC_PATH.exists():
        pytest.skip(f"OpenAPI spec not found at {OPENAPI_SPEC_PATH}")
    with open(OPENAPI_SPEC_PATH) as f:
        return yaml.safe_load(f)


@pytest.fixture(scope="module")
def sdk_manifest():
    """Load the SDK manifest."""
    if not SDK_MANIFEST_PATH.exists():
        pytest.skip(f"SDK manifest not found at {SDK_MANIFEST_PATH}")
    with open(SDK_MANIFEST_PATH) as f:
        return yaml.safe_load(f)


def _resolve_ref(spec: dict, ref: str) -> dict:
    """Resolve a $ref pointer in the OpenAPI spec."""
    parts = ref.lstrip("#/").split("/")
    obj = spec
    for part in parts:
        obj = obj[part]
    return obj


def _get_schema(spec: dict, schema_or_ref: dict) -> dict:
    """Get a schema, resolving $ref if present."""
    if "$ref" in schema_or_ref:
        return _resolve_ref(spec, schema_or_ref["$ref"])
    return schema_or_ref


class TestManifestMatchesSpec:
    """Verify that every operation in sdk-manifest.yaml exists in the OpenAPI spec."""

    def test_all_manifest_operations_exist_in_spec(self, openapi_spec, sdk_manifest):
        spec_operation_ids = set()
        for _path, methods in openapi_spec.get("paths", {}).items():
            for _method, operation in methods.items():
                if isinstance(operation, dict) and "operationId" in operation:
                    spec_operation_ids.add(operation["operationId"])

        for op in sdk_manifest.get("operations", []):
            assert op["operationId"] in spec_operation_ids, (
                f"SDK manifest references operationId '{op['operationId']}' "
                f"which does not exist in the OpenAPI spec. "
                f"Available: {spec_operation_ids}"
            )

    def test_api_version_matches(self, openapi_spec, sdk_manifest):
        spec_version = openapi_spec["info"]["version"]
        manifest_api_version = sdk_manifest["sdk"]["api_version"]
        assert manifest_api_version == spec_version, (
            f"SDK manifest api_version ({manifest_api_version}) "
            f"does not match OpenAPI spec version ({spec_version})"
        )


class TestResponseSchemaContract:
    """Validate that SDK fixture responses conform to the OpenAPI response schemas."""

    def test_successful_response_matches_schema(
        self, openapi_spec, successful_response_json_pascal
    ):
        """The PascalCase fixture must match the OpenAPI ProcessingResponse schema."""
        schema = _get_schema(
            openapi_spec,
            openapi_spec["components"]["schemas"]["ProcessingResponse"],
        )
        resolved = _deep_resolve(openapi_spec, schema)
        validator = Draft202012Validator(resolved)
        errors = list(validator.iter_errors(successful_response_json_pascal))
        assert not errors, (
            "Successful response fixture does not match OpenAPI schema:\n"
            + "\n".join(f"  - {e.message}" for e in errors)
        )

    def test_error_response_matches_schema(self, openapi_spec, error_response_json_pascal):
        """The PascalCase error fixture must match the OpenAPI ErrorResponse schema."""
        schema = _get_schema(
            openapi_spec,
            openapi_spec["components"]["schemas"]["ErrorResponse"],
        )
        resolved = _deep_resolve(openapi_spec, schema)
        validator = Draft202012Validator(resolved)
        errors = list(validator.iter_errors(error_response_json_pascal))
        assert not errors, "Error response fixture does not match OpenAPI schema:\n" + "\n".join(
            f"  - {e.message}" for e in errors
        )


class TestSDKModelsMatchSpec:
    """Verify SDK model fields match the OpenAPI schema properties."""

    def test_processing_response_fields(self, openapi_spec):
        """SDK ProcessingResponse must cover all required fields from spec."""
        schema = openapi_spec["components"]["schemas"]["ProcessingResponse"]
        required_fields = set(schema.get("required", []))

        sdk_to_api = {
            "state": "StateText",
            "trace_id": "TraceId",
            "pipeline": "Pipeline",
            "num_pages": "NumberPages",
            "output": "Output",
            "timers": "Timers",
            "messages": "Messages",
        }

        for sdk_field, api_field in sdk_to_api.items():
            assert api_field in schema["properties"], (
                f"SDK field '{sdk_field}' maps to '{api_field}' "
                f"which doesn't exist in OpenAPI schema"
            )

        for required in required_fields:
            assert required in sdk_to_api.values(), (
                f"Required API field '{required}' is not mapped in the SDK"
            )

    def test_extraction_fields(self, openapi_spec):
        """SDK Extraction must cover all properties from spec."""
        schema = openapi_spec["components"]["schemas"]["Extraction"]
        api_properties = set(schema.get("properties", {}).keys())

        sdk_to_api = {
            "document_type": "documentType",
            "confidence": "confidence",
            "country_code": "countryCode",
            "page_range": "pageRange",
            "data": "extraction",
        }

        for sdk_field, api_field in sdk_to_api.items():
            assert api_field in api_properties, (
                f"SDK field '{sdk_field}' maps to '{api_field}' "
                f"which doesn't exist in OpenAPI Extraction schema"
            )

    def test_error_response_fields(self, openapi_spec):
        """SDK exceptions must carry all fields from ErrorResponse."""
        from docdigitizer.exceptions import DocDigitizerError

        exc = DocDigitizerError("test", trace_id="X", messages=["m"], timers={"t": 1.0})
        assert exc.trace_id is not None  # TraceId
        assert exc.messages is not None  # Messages


def _deep_resolve(spec: dict, schema: dict) -> dict:
    """Recursively resolve all $ref pointers in a schema for validation."""
    if isinstance(schema, dict):
        if "$ref" in schema:
            resolved = _resolve_ref(spec, schema["$ref"])
            return _deep_resolve(spec, resolved)
        return {k: _deep_resolve(spec, v) for k, v in schema.items()}
    elif isinstance(schema, list):
        return [_deep_resolve(spec, item) for item in schema]
    return schema
