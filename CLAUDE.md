# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Official SDKs and integrations for the DocDigitizer Document Processing API. DocDigitizer provides intelligent document processing: upload PDFs and get structured data back (OCR, classification, extraction) for invoices, receipts, contracts, CVs, ID documents, and bank statements.

## Mandatory Policies

- **Always update documentation** after implementing or publishing features. This includes: `README.md` (root), `CLAUDE.md`, `docs/INTEGRATION-PLAN.md`, and any relevant per-package READMEs. Documentation updates must be part of the same commit or follow-up commit — never skip this step.

## Key Architecture Concepts

**OpenAPI spec is the single source of truth**: `openapi/sync.openapi.yaml` (copied from sync2025). All SDKs are validated against this spec via contract tests.

**Explicit endpoint selection**: Each SDK/integration has a `sdk-manifest.yaml` declaring which API operations it supports. Not all endpoints need to be in every SDK.

**Contract testing**: SDK tests validate models and methods match the OpenAPI spec. If the API changes and the SDK doesn't update, contract tests fail.

**Dual-case response parsing**: The API returns camelCase (`stateText`, `traceId`, `docType`, `country`) while the OpenAPI spec defines PascalCase. All SDKs handle both cases for resilience.

## Published Packages

| Package | Registry | Language |
|---------|----------|----------|
| `docdigitizer` | PyPI | Python |
| `docdigitizer` | npm | Node.js/TypeScript |
| `docdigitizer` | crates.io | Rust |
| `DocDigitizer` | NuGet | C# |
| `github.com/.../sdks/go` | Go modules | Go |
| `langchain-docdigitizer` | PyPI | Python |
| `llama-index-readers-docdigitizer` | PyPI | Python |
| `@docdigitizer/langchain` | npm | TypeScript |
| `docdigitizer-ai` | npm | TypeScript |
| `@docdigitizer/mcp-server` | npm | TypeScript |
| `n8n-nodes-docdigitizer` | npm | TypeScript |
| `zapier-docdigitizer` | Zapier Platform | JavaScript |
| `make-docdigitizer` | Make Developer Hub | JSON |

## Build & Test Commands

### Python SDK
```bash
cd sdks/python
pip install -e ".[dev]"
pytest tests/ -m "not integration" -v          # Unit + contract tests
pytest tests/test_integration.py -v            # Live API (needs DD_API_KEY)
ruff check src/ tests/ && ruff format src/ tests/
```

### Node.js SDK
```bash
cd sdks/node
npm install && npm test                        # vitest
```

### Go SDK
```bash
cd sdks/go
go test ./...
```

### C# SDK
```bash
cd sdks/csharp
dotnet restore && dotnet build && dotnet test
```

### Rust SDK
```bash
cd sdks/rust
cargo build && cargo test
```

### LangChain Python
```bash
cd integrations/langchain/python
pip install -e ".[dev]" && pytest tests/ -v
```

### LangChain JS
```bash
cd integrations/langchain/js
npm install && npm test
```

### LlamaIndex
```bash
cd integrations/llamaindex
pip install -e ".[dev]" && pytest tests/ -v
```

### Vercel AI SDK
```bash
cd integrations/vercel-ai
npm install && npm test
```

### MCP Server
```bash
cd integrations/mcp-server
npm install && npm run build
```

### n8n Node
```bash
cd integrations/n8n
npm install && npm run build && npm test
```

### Zapier
```bash
cd integrations/zapier
npm install && npm test                        # jest
```

### Make (Integromat)
```bash
cd integrations/make
npm install && npm test                        # node --test (contract tests)
```

## Utility Scripts

```bash
python scripts/sync_openapi.py                 # Pull latest spec from sync2025
python scripts/sync_openapi.py --check         # Check for drift (CI)
python scripts/validate_sdk.py sdks/python     # Validate manifest vs spec
python scripts/bump_version.py sdks/python patch  # 0.1.0 -> 0.1.1
python tests/validate_manifests.py             # Validate all SDK manifests
```

## CI/CD Workflows

**Test workflows** (triggered on path changes):
- `test-python-sdk.yml`, `test-node-sdk.yml`, `test-go-sdk.yml`, `test-csharp-sdk.yml`, `test-rust-sdk.yml`
- `test-langchain-python.yml`, `test-langchain-js.yml`, `test-llamaindex.yml`, `test-vercel-ai.yml`
- `test-n8n.yml`, `test-zapier.yml`, `test-make.yml`

**Publish workflows** (triggered on tags):
- `python-v*` → PyPI, `node-v*` → npm, `go-v*` → GitHub Release, `csharp-v*` → NuGet, `rust-v*` → crates.io
- `langchain-python-v*` → PyPI, `langchain-js-v*` → npm, `llamaindex-v*` → PyPI, `vercel-ai-v*` → npm
- `n8n-v*` → npm

**Other**: `spec-drift-check.yml` — weekly drift detection

## Key Files

| File | Purpose |
|------|---------|
| `openapi/sync.openapi.yaml` | Canonical API spec (source of truth) |
| `sdk-config.yaml` | Global API version, base URLs, upstream source |
| `sdks/*/sdk-manifest.yaml` | Which operations each SDK supports |
| `integrations/*/sdk-manifest.yaml` | Which operations each integration supports |
| `scripts/validate_sdk.py` | Validate any SDK's manifest against spec |

## Adding a New SDK or Integration

1. Create directory with `sdk-manifest.yaml` listing supported operationIds
2. Implement client/loader matching the manifest operations
3. Write contract tests that load `openapi/sync.openapi.yaml` and validate
4. Add CI workflow in `.github/workflows/`
5. Add publish workflow triggered by tag

## Design Principles

- Typed responses — dataclasses/models/structs, not raw dicts
- Async + sync where language supports it
- Accept file paths, bytes, streams
- Error hierarchy: AuthenticationError, ValidationError, RateLimitError, ServerError, TimeoutError, ServiceUnavailableError
- Retry with exponential backoff for 5xx/429 (max 3 retries, delay = min(1000 * 2^attempt, 30000)ms)
- Configurable base URL and timeout
- Minimal dependencies
- Integrations wrap published SDKs — no direct HTTP calls

## API Quick Reference

**Base URL:** `https://api.docdigitizer.com/v3/docingester`
**Auth:** `X-API-Key` header
**Config env vars:** `DOCDIGITIZER_API_KEY`, `DOCDIGITIZER_BASE_URL`, `DOCDIGITIZER_TIMEOUT`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/extract` | POST | Process document (`multipart/form-data`: `files`, `id`, `contextID`) |
| `/` | GET | Health check (no auth required, returns `"I am alive"`) |

## Deprecation Notice

**v0.1.x is deprecated.** The previous API endpoint (`https://apix.docdigitizer.com/sync`) has been replaced. All SDKs and integrations must use v0.2.0+ which points to `https://api.docdigitizer.com/v3/docingester`.
