#!/usr/bin/env python3
"""Validate an SDK's manifest and models against the OpenAPI spec.

Usage:
    python scripts/validate_sdk.py sdks/python
    python scripts/validate_sdk.py sdks/node

Checks:
1. All operationIds in sdk-manifest.yaml exist in the OpenAPI spec
2. The api_version in the manifest matches the spec version
3. Reports any spec operations NOT covered by the SDK (informational)
"""

from __future__ import annotations

import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
SPEC_PATH = REPO_ROOT / "openapi" / "sync.openapi.yaml"


def load_yaml(path: Path) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def get_spec_operations(spec: dict) -> dict[str, dict]:
    """Extract all operationIds from the OpenAPI spec."""
    operations = {}
    for path, methods in spec.get("paths", {}).items():
        for method, operation in methods.items():
            if isinstance(operation, dict) and "operationId" in operation:
                operations[operation["operationId"]] = {
                    "method": method.upper(),
                    "path": path,
                    "summary": operation.get("summary", ""),
                }
    return operations


def validate(sdk_dir: Path) -> int:
    manifest_path = sdk_dir / "sdk-manifest.yaml"
    if not manifest_path.exists():
        print(f"ERROR: No sdk-manifest.yaml in {sdk_dir}")
        return 1

    if not SPEC_PATH.exists():
        print(f"ERROR: OpenAPI spec not found at {SPEC_PATH}")
        return 1

    spec = load_yaml(SPEC_PATH)
    manifest = load_yaml(manifest_path)

    spec_ops = get_spec_operations(spec)
    errors = 0

    # Check api_version
    spec_version = spec["info"]["version"]
    sdk_api_version = manifest["sdk"]["api_version"]
    if sdk_api_version != spec_version:
        print(f"WARNING: SDK api_version ({sdk_api_version}) != spec ({spec_version})")
        errors += 1

    # Check operations
    sdk_ops = {op["operationId"] for op in manifest.get("operations", [])}
    for op_id in sdk_ops:
        if op_id not in spec_ops:
            print(f"ERROR: operationId '{op_id}' not found in OpenAPI spec")
            errors += 1
        else:
            info = spec_ops[op_id]
            print(f"  OK: {op_id} -> {info['method']} {info['path']}")

    # Report uncovered operations (informational)
    uncovered = set(spec_ops.keys()) - sdk_ops
    if uncovered:
        print(f"\nINFO: Operations in spec not covered by this SDK:")
        for op_id in sorted(uncovered):
            info = spec_ops[op_id]
            print(f"  - {op_id} ({info['method']} {info['path']})")

    if errors:
        print(f"\n{errors} error(s) found")
        return 1

    print(f"\nAll {len(sdk_ops)} SDK operations validated against spec")
    return 0


def main() -> None:
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <sdk-directory>")
        print(f"Example: {sys.argv[0]} sdks/python")
        sys.exit(1)

    sdk_dir = REPO_ROOT / sys.argv[1]
    if not sdk_dir.is_dir():
        print(f"ERROR: {sdk_dir} is not a directory")
        sys.exit(1)

    sys.exit(validate(sdk_dir))


if __name__ == "__main__":
    main()
