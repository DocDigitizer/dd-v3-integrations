# DocDigitizer Integrations & SDKs — Plan

## Status Summary

| Phase | Item | Status |
|-------|------|--------|
| **1** | Python SDK (`docdigitizer`) | **Published** v0.1.0 on PyPI |
| **1** | Node.js SDK (`docdigitizer`) | **Published** v0.1.0 on npm |
| **1** | Go SDK | **Published** v0.1.0 on GitHub |
| **1** | C# SDK (`DocDigitizer`) | **Published** v0.1.0 on NuGet |
| **1** | Rust SDK (`docdigitizer`) | **Published** v0.1.0 on crates.io |
| **2** | LangChain Python (`langchain-docdigitizer`) | **Published** v0.1.0 on PyPI |
| **2** | LangChain JS (`@docdigitizer/langchain`) | **Published** v0.1.0 on npm |
| **2** | LlamaIndex (`llama-index-readers-docdigitizer`) | **Published** v0.1.0 on PyPI |
| **2** | Vercel AI SDK (`docdigitizer-ai`) | **Published** v0.1.0 on npm |
| **3** | MCP Server (`@docdigitizer/mcp-server`) | **Published** v0.1.0 on npm |
| **3** | Claude Plugin | **Published** v0.1.0 |
| **4** | n8n Node | Planned |
| **4** | Zapier | Planned |
| **4** | Make (Integromat) | Planned |

---

## API Surface for SDK Coverage

Based on the analysis of `sync2025`, the DocDigitizer API has two tiers:

### Tier 1 — Public API (SDK Priority)
These are the endpoints every SDK and integration must support:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /` (Sync API) | `POST` | Process document (upload PDF → get extractions) |
| `GET /` (Sync API) | `GET` | Health check |

This is the **core value proposition**: upload a document, get structured data back.

### Tier 2 — Customer Portal API (Management SDK)
These endpoints are for account/org management and would be in an optional management module:

| Group | Endpoints | Purpose |
|-------|-----------|---------|
| Auth | 7 | OAuth login (Google/Microsoft), token refresh |
| Users | 6 | CRUD user management |
| Organizations | 6 | CRUD org management |
| API Keys | 5 | Create, list, revoke, rotate keys |
| Credits | 5 | Balance, transactions, charge |
| Audit | 3 | Audit log queries |
| Health | 3 | Health/liveness/readiness |

### Tier 3 — Advanced API (Power Users)
These endpoints are for advanced use cases:

| Group | Endpoints | Purpose |
|-------|-----------|---------|
| Classifier | 2 | Direct text/file classification |
| DocWorker Pipelines | 2 | List/reload pipelines |
| Schemas | 3 | Get labels, schemas, generated schemas |

---

## Phase 1 — Core SDKs (Priority: High)

### 1.1 Python SDK (`docdigitizer`)

**Priority:** Highest — Most common language for document processing.

**Package:** PyPI `docdigitizer`

**Scope:**
```python
from docdigitizer import DocDigitizer

dd = DocDigitizer(api_key="dd_live_...")

# Core: Process document
result = dd.process("invoice.pdf")
result = dd.process(file_bytes, filename="invoice.pdf")
result = dd.process("invoice.pdf", pipeline="MainPipelineWithFile")

# Result access
result.state           # "COMPLETED"
result.trace_id        # "ABC1234"
result.num_pages       # 3
result.extractions     # list of ExtractionResult
result.extractions[0].document_type  # "Invoice"
result.extractions[0].confidence     # 0.95
result.extractions[0].country_code   # "PT"
result.extractions[0].page_range     # (1, 2)
result.extractions[0].data           # dict with extracted fields

# Classify only
classifications = dd.classify("invoice.pdf")
classifications = dd.classify_text("Invoice number INV-001...")

# Schema info
labels = dd.get_labels()             # supported doc types & countries
schema = dd.get_schema("invoice", "PT")

# Async support
result = await dd.async_process("invoice.pdf")
```

**Management module (optional):**
```python
from docdigitizer.management import ManagementClient

mgmt = ManagementClient(access_token="jwt-token")
mgmt.users.me()
mgmt.organizations.list()
mgmt.api_keys.create(org_id="...", name="Production")
mgmt.credits.balance(org_id="...")
```

**Structure:**
```
sdks/python/
├── pyproject.toml
├── README.md
├── docdigitizer/
│   ├── __init__.py
│   ├── client.py           # Main DocDigitizer class
│   ├── models.py           # Response models (dataclasses)
│   ├── exceptions.py       # Custom exceptions
│   ├── management/
│   │   ├── __init__.py
│   │   ├── client.py
│   │   ├── users.py
│   │   ├── organizations.py
│   │   ├── api_keys.py
│   │   └── credits.py
│   └── _http.py            # HTTP transport (httpx)
└── tests/
    ├── test_client.py
    ├── test_models.py
    └── test_management.py
```

### 1.2 Node.js/TypeScript SDK (`@docdigitizer/sdk`)

**Priority:** Highest — Web developers, serverless, AI integrations.

**Package:** npm `@docdigitizer/sdk`

**Scope:**
```typescript
import { DocDigitizer } from '@docdigitizer/sdk';

const dd = new DocDigitizer({ apiKey: 'dd_live_...' });

// Core: Process document
const result = await dd.process('./invoice.pdf');
const result = await dd.process(buffer, { filename: 'invoice.pdf' });
const result = await dd.process(readableStream);

// Result access
result.state;                            // "COMPLETED"
result.extractions[0].documentType;      // "Invoice"
result.extractions[0].extraction;        // structured data

// Classify only
const cls = await dd.classify('./invoice.pdf');
const cls = await dd.classifyText('Invoice number INV-001...');

// Schema info
const labels = await dd.getLabels();
const schema = await dd.getSchema('invoice', 'PT');
```

**Structure:**
```
sdks/node/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── client.ts
│   ├── models.ts
│   ├── errors.ts
│   ├── management/
│   │   ├── index.ts
│   │   ├── users.ts
│   │   ├── organizations.ts
│   │   ├── api-keys.ts
│   │   └── credits.ts
│   └── http.ts
└── tests/
    ├── client.test.ts
    └── management.test.ts
```

### 1.3 Go SDK

**Priority:** Medium — Infrastructure, CLI tools, high-performance services.

**Package:** `github.com/DocDigitizer/dd-v3-integrations/sdks/go`

**Structure:**
```
sdks/go/
├── go.mod
├── README.md
├── docdigitizer/
│   ├── client.go
│   ├── models.go
│   ├── errors.go
│   └── management/
│       ├── client.go
│       ├── users.go
│       └── organizations.go
└── docdigitizer_test.go
```

### 1.4 C#/.NET SDK (`DocDigitizer.SDK`)

**Priority:** Medium — Enterprise, matches the backend stack (ASP.NET Core).

**Package:** NuGet `DocDigitizer.SDK`

**Structure:**
```
sdks/csharp/
├── DocDigitizer.SDK.csproj
├── README.md
├── DocDigitizer/
│   ├── DocDigitizerClient.cs
│   ├── Models/
│   │   ├── ProcessResult.cs
│   │   ├── Extraction.cs
│   │   └── Classification.cs
│   ├── Exceptions/
│   │   └── DocDigitizerException.cs
│   └── Management/
│       ├── ManagementClient.cs
│       ├── UsersApi.cs
│       └── OrganizationsApi.cs
└── DocDigitizer.SDK.Tests/
    └── ClientTests.cs
```

### 1.5 Rust SDK

**Priority:** Low — Niche but differentiating.

**Package:** crates.io `docdigitizer`

---

## Phase 2 — AI Framework Integrations (Priority: High)

### 2.1 LangChain Integration

**Why:** Most popular AI framework. DocDigitizer becomes a document loader for RAG pipelines.

**Python package:** `langchain-docdigitizer`
**JS package:** `@docdigitizer/langchain`

```python
from langchain_docdigitizer import DocDigitizerLoader

loader = DocDigitizerLoader(api_key="dd_live_...")
documents = loader.load("invoices/batch/")

# Each Document has:
# - page_content: extracted text + structured fields
# - metadata: document_type, confidence, country, page_range
```

```typescript
import { DocDigitizerLoader } from '@docdigitizer/langchain';

const loader = new DocDigitizerLoader({ apiKey: 'dd_live_...' });
const docs = await loader.load('./invoices/');
```

**Structure:**
```
integrations/langchain/
├── python/
│   ├── pyproject.toml
│   ├── langchain_docdigitizer/
│   │   ├── __init__.py
│   │   ├── document_loader.py
│   │   └── utils.py
│   └── tests/
└── js/
    ├── package.json
    └── src/
        ├── index.ts
        └── document-loader.ts
```

### 2.2 LlamaIndex Integration

**Why:** Second most popular RAG framework.

**Package:** `llama-index-readers-docdigitizer`

```python
from llama_index.readers.docdigitizer import DocDigitizerReader

reader = DocDigitizerReader(api_key="dd_live_...")
documents = reader.load_data(file_path="invoices/")
```

**Structure:**
```
integrations/llamaindex/
├── pyproject.toml
├── llama_index/
│   └── readers/
│       └── docdigitizer/
│           ├── __init__.py
│           └── base.py
└── tests/
```

### 2.3 Vercel AI SDK Integration

**Why:** Popular for Next.js apps that need document processing.

**Package:** `@docdigitizer/vercel-ai`

```typescript
import { docdigitizer } from '@docdigitizer/vercel-ai';

const provider = docdigitizer({ apiKey: 'dd_live_...' });
// Use as tool in AI SDK
```

---

## Phase 3 — MCP Server (Priority: High)

### 3.1 MCP Server for DocDigitizer

**Why:** Allows Claude, Cursor, VS Code Copilot, and 30+ AI tools to use DocDigitizer directly.

**Package:** npm `@docdigitizer/mcp-server`

**Tools exposed:**
| Tool | Description |
|------|-------------|
| `process_document` | Upload and process a PDF document |
| `classify_document` | Classify a document's type and country |
| `get_document_types` | List supported document types |
| `get_extraction_schema` | Get JSON schema for a document type |
| `check_credits` | Check organization credit balance |

**Resources exposed:**
| Resource | Description |
|----------|-------------|
| `docdigitizer://labels` | Supported document types and countries |
| `docdigitizer://schema/{docType}/{country}` | JSON Schema for extraction |

**Structure:**
```
integrations/mcp-server/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── server.ts
│   ├── tools/
│   │   ├── process.ts
│   │   ├── classify.ts
│   │   └── schema.ts
│   └── resources/
│       ├── labels.ts
│       └── schema.ts
└── tests/
```

**Usage in Claude Desktop (`claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "docdigitizer": {
      "command": "npx",
      "args": ["@docdigitizer/mcp-server"],
      "env": {
        "DOCDIGITIZER_API_KEY": "dd_live_..."
      }
    }
  }
}
```

---

## Phase 4 — Workflow Automation (Priority: Medium)

### 4.1 n8n Community Node

**Package:** `n8n-nodes-docdigitizer`

**Operations:**
- Process Document (file input → extraction output)
- Classify Document
- Get Labels
- Manage API Keys (CRUD)
- Check Credit Balance

**Structure:**
```
integrations/n8n/
├── package.json
├── nodes/
│   └── DocDigitizer/
│       ├── DocDigitizer.node.ts
│       ├── DocDigitizer.node.json
│       └── operations/
│           ├── process.ts
│           ├── classify.ts
│           └── management.ts
├── credentials/
│   └── DocDigitizerApi.credentials.ts
└── tests/
```

### 4.2 Zapier Integration

**Operations:**
- Trigger: New document processed (webhook)
- Action: Process document
- Action: Classify document
- Search: Get credit balance

**Structure:**
```
integrations/zapier/
├── package.json
├── index.js
├── authentication.js
├── triggers/
│   └── new_extraction.js
├── creates/
│   ├── process_document.js
│   └── classify_document.js
├── searches/
│   └── credit_balance.js
└── test/
```

### 4.3 Make (Integromat) Module

**Modules:**
- Process Document
- Classify Document
- Get Labels
- Credit Balance

---

## Implementation Priority & Timeline

| Phase | Item | Priority | Dependencies | Status |
|-------|------|----------|--------------|--------|
| **1** | Python SDK | Highest | None | **Done** |
| **1** | Node.js SDK | Highest | None | **Done** |
| **1** | Go SDK | Medium | None | **Done** |
| **1** | C# SDK | Medium | None | **Done** |
| **1** | Rust SDK | Low | None | **Done** |
| **2** | LangChain (Python) | High | Python SDK | **Done** |
| **2** | LlamaIndex | High | Python SDK | **Done** |
| **2** | LangChain (JS) | High | Node.js SDK | **Done** |
| **2** | Vercel AI SDK | Medium | Node.js SDK | **Done** |
| **3** | MCP Server | High | Node.js SDK | **Done** |
| **3** | Claude Plugin | High | MCP Server | **Done** |
| **4** | n8n Node | Medium | Node.js SDK | Planned |
| **4** | Zapier | Medium | None | Planned |
| **4** | Make | Medium | None | Planned |

## Design Principles

1. **Consistent API across SDKs** — Same method names, same parameter patterns, same result shapes adapted to language idioms.
2. **Minimal dependencies** — Each SDK should have as few dependencies as possible.
3. **Typed responses** — All SDKs use typed models/structs, not raw dicts/objects.
4. **Async-first** — All SDKs support async/await natively where the language supports it.
5. **File flexibility** — Accept file paths, byte arrays, streams, and buffers.
6. **Error hierarchy** — `AuthenticationError`, `ValidationError`, `RateLimitError`, `ServerError`, `TimeoutError`.
7. **Retry with backoff** — Built-in retry for 5xx and 429 errors.
8. **Configurable base URL** — Allow pointing to custom/self-hosted instances.
