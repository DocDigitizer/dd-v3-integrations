"""Contract tests: verify SDK manifest operations match OpenAPI spec."""

import os
from pathlib import Path

import pytest
import yaml


def _load_yaml(path: str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


@pytest.fixture
def manifest():
    manifest_path = Path(__file__).parent.parent / "sdk-manifest.yaml"
    return _load_yaml(str(manifest_path))


@pytest.fixture
def openapi_spec():
    spec_path = Path(__file__).parent.parent.parent.parent.parent / "openapi" / "sync.openapi.yaml"
    if not spec_path.exists():
        pytest.skip("OpenAPI spec not found")
    return _load_yaml(str(spec_path))


class TestContract:
    def test_manifest_has_operations(self, manifest):
        assert "operations" in manifest
        assert len(manifest["operations"]) > 0

    def test_manifest_operations_match_spec(self, manifest, openapi_spec):
        spec_operation_ids = set()
        for path_item in openapi_spec.get("paths", {}).values():
            for method_data in path_item.values():
                if isinstance(method_data, dict) and "operationId" in method_data:
                    spec_operation_ids.add(method_data["operationId"])

        for op in manifest["operations"]:
            assert op["operationId"] in spec_operation_ids, (
                f"Operation '{op['operationId']}' not found in OpenAPI spec. "
                f"Available: {spec_operation_ids}"
            )

    def test_manifest_api_version(self, manifest):
        assert manifest["sdk"]["api_version"] == "1.0.0"

    def test_manifest_type_is_integration(self, manifest):
        assert manifest["sdk"]["type"] == "integration"
        assert manifest["sdk"]["framework"] == "langchain"
