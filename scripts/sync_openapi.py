#!/usr/bin/env python3
"""Sync the OpenAPI spec from the upstream sync2025 repository.

Usage:
    python scripts/sync_openapi.py                     # From default repo
    python scripts/sync_openapi.py --source /path/to   # From local checkout
    python scripts/sync_openapi.py --check              # Check only, no update

This script compares the local spec with the upstream version and reports
differences. Use --check in CI to detect spec drift.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
LOCAL_SPEC = REPO_ROOT / "openapi" / "sync.openapi.yaml"
SDK_CONFIG = REPO_ROOT / "sdk-config.yaml"

DEFAULT_REPO = "https://github.com/DocDigitizer/sync2025.git"
DEFAULT_PATH = "docs/openapi/sync.openapi.yaml"


def get_upstream_spec(source: str | None) -> str:
    """Get the upstream spec content, either from a local path or by cloning."""
    if source and Path(source).exists():
        spec_path = Path(source) / DEFAULT_PATH
        if not spec_path.exists():
            print(f"Error: spec not found at {spec_path}")
            sys.exit(1)
        return spec_path.read_text()

    # Clone into temp dir
    with tempfile.TemporaryDirectory() as tmpdir:
        repo_url = source or DEFAULT_REPO
        print(f"Cloning {repo_url}...")
        subprocess.run(
            ["git", "clone", "--depth", "1", repo_url, tmpdir],
            check=True,
            capture_output=True,
        )
        spec_path = Path(tmpdir) / DEFAULT_PATH
        if not spec_path.exists():
            print(f"Error: spec not found at {DEFAULT_PATH} in repo")
            sys.exit(1)
        return spec_path.read_text()


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync OpenAPI spec from upstream")
    parser.add_argument("--source", help="Local path to sync2025 repo (or remote URL)")
    parser.add_argument("--check", action="store_true", help="Check only, don't update")
    args = parser.parse_args()

    upstream_content = get_upstream_spec(args.source)

    if not LOCAL_SPEC.exists():
        if args.check:
            print("DRIFT: Local spec does not exist")
            sys.exit(1)
        LOCAL_SPEC.parent.mkdir(parents=True, exist_ok=True)
        LOCAL_SPEC.write_text(upstream_content)
        print(f"Created {LOCAL_SPEC}")
        return

    local_content = LOCAL_SPEC.read_text()

    if local_content == upstream_content:
        print("OK: Local spec matches upstream")
        return

    # Show diff
    print("DRIFT detected between local and upstream spec:")
    import difflib

    diff = difflib.unified_diff(
        local_content.splitlines(keepends=True),
        upstream_content.splitlines(keepends=True),
        fromfile="local/sync.openapi.yaml",
        tofile="upstream/sync.openapi.yaml",
    )
    sys.stdout.writelines(diff)

    if args.check:
        sys.exit(1)

    LOCAL_SPEC.write_text(upstream_content)
    print(f"\nUpdated {LOCAL_SPEC}")


if __name__ == "__main__":
    main()
