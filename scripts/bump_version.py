#!/usr/bin/env python3
"""Bump SDK version in sdk-manifest.yaml and language-specific version file.

Usage:
    python scripts/bump_version.py sdks/python patch   # 0.1.0 -> 0.1.1
    python scripts/bump_version.py sdks/python minor   # 0.1.0 -> 0.2.0
    python scripts/bump_version.py sdks/python major   # 0.1.0 -> 1.0.0
    python scripts/bump_version.py sdks/python 0.3.0   # Set explicit version
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent

VERSION_FILES = {
    "python": "src/docdigitizer/_version.py",
    "node": "package.json",
    "go": "version.go",
    "csharp": "DocDigitizer.SDK.csproj",
    "rust": "Cargo.toml",
}


def parse_semver(version: str) -> tuple[int, int, int]:
    match = re.match(r"(\d+)\.(\d+)\.(\d+)", version)
    if not match:
        raise ValueError(f"Invalid semver: {version}")
    return int(match.group(1)), int(match.group(2)), int(match.group(3))


def bump(current: str, bump_type: str) -> str:
    major, minor, patch = parse_semver(current)
    if bump_type == "patch":
        return f"{major}.{minor}.{patch + 1}"
    elif bump_type == "minor":
        return f"{major}.{minor + 1}.0"
    elif bump_type == "major":
        return f"{major + 1}.0.0"
    else:
        # Explicit version
        parse_semver(bump_type)  # validate
        return bump_type


def update_manifest(manifest_path: Path, new_version: str) -> None:
    content = manifest_path.read_text()
    content = re.sub(
        r'(version:\s*")[\d.]+(")',
        rf"\g<1>{new_version}\g<2>",
        content,
        count=1,
    )
    manifest_path.write_text(content)


def update_python_version(sdk_dir: Path, new_version: str) -> None:
    version_file = sdk_dir / VERSION_FILES["python"]
    if version_file.exists():
        version_file.write_text(f'__version__ = "{new_version}"\n')


def main() -> None:
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <sdk-directory> <patch|minor|major|X.Y.Z>")
        sys.exit(1)

    sdk_dir = REPO_ROOT / sys.argv[1]
    bump_type = sys.argv[2]

    manifest_path = sdk_dir / "sdk-manifest.yaml"
    if not manifest_path.exists():
        print(f"ERROR: No sdk-manifest.yaml in {sdk_dir}")
        sys.exit(1)

    manifest = yaml.safe_load(manifest_path.read_text())
    current = manifest["sdk"]["version"]
    new_version = bump(current, bump_type)

    print(f"Bumping {manifest['sdk']['name']}: {current} -> {new_version}")

    update_manifest(manifest_path, new_version)

    language = manifest["sdk"]["language"]
    if language == "python":
        update_python_version(sdk_dir, new_version)

    print(f"Updated {manifest_path}")
    print(f"Don't forget to commit and tag: {language}-v{new_version}")


if __name__ == "__main__":
    main()
