#!/usr/bin/env python3
"""Cross-SDK validation: ensure all SDK manifests are consistent with the OpenAPI spec.

Usage:
    python tests/validate_manifests.py

Finds all sdk-manifest.yaml files under sdks/ and validates each one.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Reuse the validate function from the validate_sdk script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from validate_sdk import validate

REPO_ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    sdks_dir = REPO_ROOT / "sdks"
    if not sdks_dir.exists():
        print("No sdks/ directory found")
        sys.exit(0)

    errors = 0
    validated = 0

    for sdk_dir in sorted(sdks_dir.iterdir()):
        if not sdk_dir.is_dir():
            continue
        manifest = sdk_dir / "sdk-manifest.yaml"
        if not manifest.exists():
            continue

        print(f"\n{'='*60}")
        print(f"Validating {sdk_dir.name}")
        print(f"{'='*60}")
        result = validate(sdk_dir)
        if result != 0:
            errors += 1
        validated += 1

    print(f"\n{'='*60}")
    print(f"Validated {validated} SDK(s), {errors} with errors")

    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
