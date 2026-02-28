# DocDigitizer Integrations & SDKs

Official SDKs and integrations for the [DocDigitizer](https://docdigitizer.com) Document Processing API.

DocDigitizer provides intelligent document processing — upload PDFs and get structured data back with OCR, classification, and extraction for invoices, receipts, contracts, CVs, ID documents, and bank statements.

## SDKs

| SDK | Language | Package | Install | Version |
|-----|----------|---------|---------|---------|
| [Python](./sdks/python) | Python 3.8+ | [`docdigitizer`](https://pypi.org/project/docdigitizer/) | `pip install docdigitizer` | v0.1.0 |
| [Node.js](./sdks/node) | TypeScript/JS | [`docdigitizer`](https://www.npmjs.com/package/docdigitizer) | `npm install docdigitizer` | v0.1.0 |
| [Go](./sdks/go) | Go 1.21+ | [`docdigitizer`](https://github.com/DocDigitizer/dd-v3-integrations/tree/main/sdks/go) | `go get github.com/DocDigitizer/dd-v3-integrations/sdks/go` | v0.1.0 |
| [C#](./sdks/csharp) | .NET 6+ | [`DocDigitizer`](https://www.nuget.org/packages/DocDigitizer) | `dotnet add package DocDigitizer` | v0.1.0 |
| [Rust](./sdks/rust) | Rust | [`docdigitizer`](https://crates.io/crates/docdigitizer) | `cargo add docdigitizer` | v0.1.0 |

## Integrations

### AI Frameworks

| Integration | Package | Install | Version |
|-------------|---------|---------|---------|
| [LangChain Python](./integrations/langchain/python) | [`langchain-docdigitizer`](https://pypi.org/project/langchain-docdigitizer/) | `pip install langchain-docdigitizer` | v0.1.0 |
| [LangChain JS](./integrations/langchain/js) | [`@docdigitizer/langchain`](https://www.npmjs.com/package/@docdigitizer/langchain) | `npm install @docdigitizer/langchain` | v0.1.0 |
| [LlamaIndex](./integrations/llamaindex) | [`llama-index-readers-docdigitizer`](https://pypi.org/project/llama-index-readers-docdigitizer/) | `pip install llama-index-readers-docdigitizer` | v0.1.0 |
| [Vercel AI SDK](./integrations/vercel-ai) | [`docdigitizer-ai`](https://www.npmjs.com/package/docdigitizer-ai) | `npm install docdigitizer-ai` | v0.1.0 |

### AI Agents

| Integration | Package | Install | Version |
|-------------|---------|---------|---------|
| [MCP Server](./integrations/mcp-server) | [`@docdigitizer/mcp-server`](https://www.npmjs.com/package/@docdigitizer/mcp-server) | `npx @docdigitizer/mcp-server` | v0.1.0 |
| [Claude Plugin](./integrations/claude-plugin) | — | [Install guide](./integrations/claude-plugin/README.md) | v0.1.0 |

### Workflow Automation

| Integration | Platform | Status |
|-------------|----------|--------|
| [n8n](./integrations/n8n) | n8n | Planned |
| [Zapier](./integrations/zapier) | Zapier | Planned |
| [Make](./integrations/make) | Make (Integromat) | Planned |

## Quick Start

### Python
```python
pip install docdigitizer
```
```python
from docdigitizer import DocDigitizer

dd = DocDigitizer(api_key="your-api-key")
result = dd.process("invoice.pdf")
print(result.extractions[0].document_type)  # "Invoice"
print(result.extractions[0].data)           # structured fields
```

### Node.js
```bash
npm install docdigitizer
```
```typescript
import { DocDigitizer } from 'docdigitizer';

const dd = new DocDigitizer({ apiKey: 'your-api-key' });
const result = await dd.process('invoice.pdf');
console.log(result.extractions[0].documentType);  // "Invoice"
console.log(result.extractions[0].extraction);     // structured fields
```

### Go
```go
dd := docdigitizer.New("your-api-key")
result, err := dd.Process(ctx, "invoice.pdf")
fmt.Println(result.Extractions[0].DocumentType)  // "Invoice"
```

### C#
```csharp
var dd = new DocDigitizerClient("your-api-key");
var result = await dd.ProcessAsync("invoice.pdf");
Console.WriteLine(result.Extractions[0].DocumentType);  // "Invoice"
```

### Rust
```rust
let dd = DocDigitizer::new("your-api-key");
let result = dd.process("invoice.pdf").await?;
println!("{}", result.extractions[0].document_type);  // "Invoice"
```

### LangChain (RAG Pipeline)
```python
pip install langchain-docdigitizer
```
```python
from langchain_docdigitizer import DocDigitizerLoader

loader = DocDigitizerLoader(api_key="your-api-key")
docs = loader.load("invoices/")  # processes all PDFs in directory
# Each doc has page_content (extracted fields) + metadata (type, confidence, ...)
```

### Vercel AI SDK (AI Agent)
```bash
npm install docdigitizer-ai ai
```
```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { processDocumentTool } from 'docdigitizer-ai';

const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Process /tmp/invoice.pdf and summarize it',
  tools: { processDocument: processDocumentTool({ apiKey: 'your-api-key' }) },
});
```

### cURL
```bash
curl -X POST https://apix.docdigitizer.com/sync \
  -H "X-API-Key: your-api-key" \
  -F "files=@invoice.pdf" \
  -F "id=$(uuidgen)" \
  -F "contextID=$(uuidgen)"
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
│   ├── python/                 # pip install docdigitizer
│   ├── node/                   # npm install docdigitizer
│   ├── go/                     # go get .../sdks/go
│   ├── csharp/                 # dotnet add package DocDigitizer
│   └── rust/                   # cargo add docdigitizer
├── integrations/
│   ├── langchain/              # Python & JS document loaders
│   │   ├── python/             # pip install langchain-docdigitizer
│   │   └── js/                 # npm install @docdigitizer/langchain
│   ├── llamaindex/             # pip install llama-index-readers-docdigitizer
│   ├── vercel-ai/              # npm install docdigitizer-ai
│   ├── mcp-server/             # npx @docdigitizer/mcp-server
│   └── claude-plugin/          # Claude Code plugin
├── scripts/
│   ├── sync_openapi.py         # Pull latest spec from upstream
│   ├── validate_sdk.py         # Validate SDK against spec
│   └── bump_version.py         # Version management
├── .github/workflows/          # CI/CD for all SDKs & integrations
└── docs/
    ├── api-reference.md
    └── INTEGRATION-PLAN.md
```

### How API Updates Flow to SDKs

1. Upstream API changes in sync2025
2. `spec-drift-check.yml` detects the change weekly (or run `python scripts/sync_openapi.py`)
3. Update `openapi/sync.openapi.yaml`
4. Run `python scripts/validate_sdk.py sdks/python` to find what needs updating
5. Update SDK → contract tests pass → bump version → tag → CI publishes

### Explicit Endpoint Selection

Each SDK and integration declares which API operations it supports in its `sdk-manifest.yaml`. Not all endpoints are exposed — this is a deliberate design choice.

## Contributing

Each SDK and integration lives in its own directory with its own build system, tests, and documentation. See the README in each directory for development setup.

## License

MIT
