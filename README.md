# DocDigitizer Integrations & SDKs

Official SDKs and integrations for the [DocDigitizer](https://docdigitizer.com) Document Processing API.

DocDigitizer provides intelligent document processing — upload PDFs and get structured data back with OCR, classification, and extraction for invoices, receipts, contracts, CVs, ID documents, and bank statements.

## SDKs

| SDK | Language | Package | Status |
|-----|----------|---------|--------|
| [Python SDK](./sdks/python) | Python 3.8+ | `docdigitizer` | **v0.1.0** |
| [Node.js SDK](./sdks/node) | TypeScript/JavaScript | `@docdigitizer/sdk` | Planned |
| [Go SDK](./sdks/go) | Go 1.21+ | `github.com/DocDigitizer/dd-v3-integrations/sdks/go` | Planned |
| [C# SDK](./sdks/csharp) | .NET 6+ | `DocDigitizer.SDK` | Planned |
| [Rust SDK](./sdks/rust) | Rust | `docdigitizer` | Planned |

## Integrations

### AI Frameworks

| Integration | Platform | Status |
|-------------|----------|--------|
| [LangChain](./integrations/langchain) | LangChain (Python & JS) | Planned |
| [LlamaIndex](./integrations/llamaindex) | LlamaIndex | Planned |
| [Vercel AI SDK](./integrations/vercel-ai) | Vercel AI SDK | Planned |

### Workflow Automation

| Integration | Platform | Status |
|-------------|----------|--------|
| [n8n](./integrations/n8n) | n8n | Planned |
| [Zapier](./integrations/zapier) | Zapier | Planned |
| [Make](./integrations/make) | Make (Integromat) | Planned |

### AI Agents

| Integration | Platform | Status |
|-------------|----------|--------|
| [MCP Server](./integrations/mcp-server) | Model Context Protocol | Planned |

## Quick Start

### Python
```python
from docdigitizer import DocDigitizer

dd = DocDigitizer(api_key="your-api-key")

result = dd.process("invoice.pdf")
print(result.extractions[0].document_type)  # "Invoice"
print(result.extractions[0].data)              # structured data
```

### Node.js
```typescript
import { DocDigitizer } from '@docdigitizer/sdk';

const dd = new DocDigitizer({ apiKey: 'your-api-key' });

const result = await dd.process('invoice.pdf');
console.log(result.extractions[0].documentType);  // "Invoice"
console.log(result.extractions[0].extraction);      // structured data
```

### cURL
```bash
curl -X POST https://apix.docdigitizer.com/sync \
  -H "X-API-Key: your-api-key" \
  -F "files=@invoice.pdf" \
  -F "id=550e8400-e29b-41d4-a716-446655440000" \
  -F "contextID=550e8400-e29b-41d4-a716-446655440001"
```

## API Overview

**Base URL:** `https://apix.docdigitizer.com/sync`

**Authentication:** `X-API-Key` header

**Core Capability:** Upload a PDF document and receive structured extraction results including document type classification, country detection, and field-level data extraction.

**Supported Document Types:** Invoice, Receipt, Contract, CV/Resume, ID Document, Bank Statement

See [full API reference](./docs/api-reference.md) for complete documentation.

## Architecture

```
dd-v3-integrations/
├── openapi/                    # SOURCE OF TRUTH
│   └── sync.openapi.yaml      # Canonical OpenAPI 3.1 spec (from sync2025)
├── sdk-config.yaml             # Global API version & base URLs
├── sdks/
│   └── python/                 # pip install docdigitizer
│       ├── sdk-manifest.yaml   # Explicit endpoint selection for this SDK
│       ├── src/docdigitizer/   # SDK source
│       └── tests/              # Unit, contract & integration tests
├── scripts/
│   ├── sync_openapi.py         # Pull latest spec from upstream
│   ├── validate_sdk.py         # Validate SDK against spec
│   └── bump_version.py         # Version management
├── tests/
│   └── validate_manifests.py   # Cross-SDK validation
├── .github/workflows/
│   ├── test-python-sdk.yml     # CI: lint + test
│   ├── publish-python-sdk.yml  # CD: publish to PyPI on tag
│   └── spec-drift-check.yml   # Weekly: detect API changes
├── integrations/               # (planned)
└── docs/
    ├── api-reference.md
    └── INTEGRATION-PLAN.md
```

### How API Updates Flow to SDKs

1. Upstream API changes in sync2025
2. `spec-drift-check.yml` detects the change weekly (or run `python scripts/sync_openapi.py`)
3. Update `openapi/sync.openapi.yaml`
4. Run `python scripts/validate_sdk.py sdks/python` to find what needs updating
5. Update SDK → contract tests pass → bump version → tag → CI publishes to PyPI

### Explicit Endpoint Selection

Each SDK declares which API operations it supports in its `sdk-manifest.yaml`. Not all endpoints are exposed — this is a deliberate design choice per SDK.

## Contributing

Each SDK and integration lives in its own directory with its own build system, tests, and documentation. See the README in each directory for development setup.

## License

MIT
