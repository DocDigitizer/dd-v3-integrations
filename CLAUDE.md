# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Official SDKs and integrations for the DocDigitizer Document Processing API. DocDigitizer provides intelligent document processing: upload PDFs and get structured data back (OCR, classification, extraction) for invoices, receipts, contracts, CVs, ID documents, and bank statements.

## Key Architecture Concepts

**OpenAPI spec is the single source of truth**: `openapi/sync.openapi.yaml` (copied from sync2025). All SDKs are validated against this spec via contract tests.

**Explicit endpoint selection**: Each SDK has a `sdk-manifest.yaml` declaring which API operations it supports. Not all endpoints need to be in every SDK.

**Contract testing**: SDK tests validate models and methods match the OpenAPI spec. If the API changes and the SDK doesn't update, contract tests fail.

## Build & Test (Python SDK)

```bash
cd sdks/python
pip install -e ".[dev]"                        # Install with dev deps
pytest tests/ -m "not integration" -v          # Unit + contract tests
pytest tests/test_integration.py -v            # Live API (needs DD_API_KEY)
ruff check src/ tests/                         # Lint
ruff format src/ tests/                        # Format
```

## Utility Scripts

```bash
python scripts/sync_openapi.py                 # Pull latest spec from sync2025
python scripts/sync_openapi.py --check         # Check for drift (CI)
python scripts/validate_sdk.py sdks/python     # Validate manifest vs spec
python scripts/bump_version.py sdks/python patch  # 0.1.0 -> 0.1.1
python tests/validate_manifests.py             # Validate all SDK manifests
```

## Key Files

| File | Purpose |
|------|---------|
| `openapi/sync.openapi.yaml` | Canonical API spec (source of truth) |
| `sdk-config.yaml` | Global API version, base URLs, upstream source |
| `sdks/python/sdk-manifest.yaml` | Which operations the Python SDK supports |
| `sdks/python/src/docdigitizer/` | Python SDK source code |
| `sdks/python/tests/test_contract.py` | Contract tests (SDK vs OpenAPI spec) |
| `scripts/validate_sdk.py` | Validate any SDK's manifest against spec |

## Adding a New SDK

1. Create `sdks/{language}/sdk-manifest.yaml` listing supported operationIds
2. Implement client matching the manifest operations
3. Write contract tests that load `openapi/sync.openapi.yaml` and validate models
4. Add CI workflow in `.github/workflows/test-{language}-sdk.yml`

## When the API Changes

1. Update `openapi/sync.openapi.yaml` (manually or `python scripts/sync_openapi.py`)
2. Run `python scripts/validate_sdk.py sdks/python` — see what broke
3. Update SDK models/client
4. Contract tests pass → bump version → tag `python-vX.Y.Z` → CI publishes

## Design Principles

- Typed responses — dataclasses/models, not raw dicts
- Async + sync clients
- Accept file paths, bytes, streams
- Error hierarchy: AuthenticationError, ValidationError, RateLimitError, ServerError, TimeoutError, ServiceUnavailableError
- Retry with exponential backoff for 5xx/429
- Configurable base URL and timeout
- Minimal dependencies (httpx for Python)

## API Quick Reference

**Base URL:** `https://apix.docdigitizer.com/sync`
**Auth:** `X-API-Key` header

Primary endpoint: `POST /` with `multipart/form-data` (fields: `files`, `id`, `contextID`). Returns JSON with `StateText`, `Output.extractions[]` containing `documentType`, `confidence`, `countryCode`, `extraction`.

Response field mapping (API PascalCase → SDK snake_case):
`StateText` → `state`, `TraceId` → `trace_id`, `NumberPages` → `num_pages`, `Output` → `output`
