# DocDigitizer API Reference

Complete API surface for SDK and integration development. Extracted from the `sync2025` codebase.

---

## Authentication

### API Key (Current)
```
Header: X-API-Key: <api-key>
```
Applied to all endpoints except health checks and metrics.

### JWT Bearer Token (Customer Portal)
```
Header: Authorization: Bearer <jwt-token>
```

Token payload:
```json
{
  "sub": "user-guid",
  "email": "user@example.com",
  "org_id": "organization-guid",
  "org_slug": "my-org",
  "role": "Owner|Admin|Member"
}
```

- Access Token TTL: 1 hour
- Refresh Token TTL: 7 days

### RBAC Roles
| Role | Permissions |
|------|-------------|
| Owner | Full org control, billing, delete org |
| Admin | Manage users, API keys, audit logs |
| Member | View resources, use API keys |

---

## Standard Response Headers

| Header | Description |
|--------|-------------|
| `X-DD-TraceId` | Request trace ID |
| `X-DD-NumberPages` | Pages processed |
| `X-DD-Timer-*` | Performance metrics (ms) |

### Log Levels (via `X-DD-LogLevel` header)
| Level | Includes |
|-------|----------|
| `minimal` | Basic output, timing totals |
| `medium` | Truncated plugin outputs, nested timers |
| `full` | Complete plugin outputs, detailed timers |

### Standard Error Format
```json
{
  "StateText": "ERROR",
  "TraceId": "ABC1234",
  "Messages": ["Error description"],
  "Timers": {}
}
```

---

## 1. Sync API (Primary Public API)

**Base URL:** `https://apix.docdigitizer.com/sync`
**Auth:** X-API-Key

### `GET /` — Health Check
- **Auth:** None
- **Response:** `200` → `"I am alive"` (text/plain)

### `POST /` — Process Document

The primary endpoint. Upload a PDF and receive structured extraction results.

**Content-Type:** `multipart/form-data`

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | binary | Yes | PDF file to process |
| `id` | UUID | Yes | Document identifier |
| `contextID` | UUID | Yes | Grouping identifier |
| `requestToken` | string | No | Max 7 chars, auto-generated if omitted |
| `pipelineIdentifier` | string | No | Default: `MainPipelineWithOCR` |

**Available Pipelines:**
- `MainPipelineWithOCR` — Full pipeline with OCR text extraction (default)
- `MainPipelineWithFile` — Full pipeline using file/vision
- `SingleDocPipelineWithOCR` — Single document with OCR
- `SingleDocPipelineWithFile` — Single document with file handling

**Response:** `application/json`
```json
{
  "StateText": "COMPLETED|ERROR|PROCESSING",
  "TraceId": "ABC1234",
  "Pipeline": "MainPipelineWithOCR",
  "NumberPages": 3,
  "Output": {
    "extractions": [
      {
        "documentType": "Invoice",
        "confidence": 0.95,
        "countryCode": "PT",
        "pageRange": { "start": 1, "end": 2 },
        "extraction": { }
      }
    ]
  },
  "Timers": {},
  "Messages": []
}
```

**Status Codes:** `200` Success, `400` Invalid request, `401` Unauthorized, `500` Server error, `503` Unavailable, `504` Timeout

**Supported Document Types:** Invoice, Receipt, Contract, CV/Resume, ID Document, Bank Statement

---

## 2. DocWorker API (Pipeline Orchestrator)

**Base URL:** `https://docworker.europe-southwest1.run.app`
**Dev URL:** `http://localhost:5001`
**Auth:** X-API-Key

### `GET /` — Health Check

### `POST /` — Process Document Through Pipeline

Same request format as Sync API, plus:

| Header | Description |
|--------|-------------|
| `X-DD-ContextId` | Context ID for tracing |
| `X-DD-Pipeline` | Pipeline override |
| `X-DD-LogLevel` | Response detail level |
| `X-DD-Debug` | Enable debug mode (true/false) |

Additional request field:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prePopulatedSteps` | string | No | JSON array of pre-populated pipeline step results |

**Response:** Same structure as Sync API, with additional `plugin_executions` and `errors` fields.

### `GET /pipelines` — List Available Pipelines

```json
{
  "pipelines": [
    "MainPipelineWithOCR",
    "MainPipelineWithFile",
    "SingleDocPipelineWithOCR",
    "SingleDocPipelineWithFile"
  ],
  "defaultPipeline": "MainPipelineWithOCR"
}
```

### `POST /pipelines/reload` — Reload Pipeline Definitions

```json
{
  "success": true,
  "message": "Pipeline definitions reloaded",
  "pipelines": ["MainPipelineWithOCR", "..."]
}
```

### `GET /metrics` — Prometheus Metrics

---

## 3. Classifier API (Document Type Detection)

**Base URL:** `https://classifier.europe-southwest1.run.app`
**Dev URL:** `http://localhost:5004`
**Auth:** X-API-Key

### `GET /` — Health Check

### `POST /classify/text` — Classify from Text

**Content-Type:** `application/json` or `application/x-protobuf`

```json
{
  "content": "INVOICE\nInvoice Number: INV-2024-001\n...",
  "doctypes": ["invoice", "receipt", "contract"],
  "countries": ["PT", "ES", "FR"],
  "id": "uuid",
  "fileName": "doc.pdf",
  "pageSeparator": "--- PAGE BREAK ---"
}
```

**Response:**
```json
{
  "id": "uuid",
  "createdAt": "2024-01-15T10:30:00Z",
  "success": true,
  "errorMessage": null,
  "classifications": [
    {
      "doctype": "invoice",
      "country": "PT",
      "pages": [1, 2],
      "confidence": 0.95
    }
  ],
  "suggestions": [],
  "model": "gpt-4o",
  "promptTokens": 150,
  "completionTokens": 50,
  "totalTokens": 200
}
```

### `POST /classify/file` — Classify from File

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | binary | Yes | Document file |
| `doctypes` | string | No | JSON array: `'["invoice", "receipt"]'` |
| `countries` | string | No | JSON array: `'["PT", "ES"]'` |
| `id` | UUID | No | Request identifier |

**Response:** Same as classify/text.

### `GET /metrics` — Prometheus Metrics

---

## 4. Plugins API (Internal Processing Services)

**Protocol:** Protobuf (`application/x-protobuf`)

**Services & Ports:**
| Plugin | Port | Purpose |
|--------|------|---------|
| GoogleVisionOCR | 5015 | OCR text extraction |
| ChatGPTDriver | 5010 | LLM-based extraction |
| DocumentPartitioner | 5020 | Multi-document splitting |
| Schemas | 5021 | Document schema management |

### Common Plugin Endpoints

#### `GET /` — Health Check
#### `GET /isalive` — Detailed Status
```json
{
  "status": "healthy",
  "instanceId": "...",
  "service": "GoogleVisionOCR",
  "configured": true
}
```

#### `POST /process` — Process Document
**Content-Type:** `application/x-protobuf`

PluginRequest protobuf fields:
```
id: UUID
contextId: UUID
requestToken: string
fileBytes: binary
fileName: string
mimeType: string
parameters: map<string, string>
previousOutputs: map<string, PreviousOutput>
```

PluginResponse protobuf fields:
```
id: UUID
success: boolean
errorMessage: string
metadata: PluginOutputMetadata
payloadClass: string  (OCRResult|LLMResult|LabelsResult|SchemaResult|PartitionerResult)
payloadBytes: binary
```

#### `GET /metrics` — Prometheus Metrics

### Schemas Plugin — Extra Endpoints

#### `POST /get-labels` — Get Document Types & Countries
```json
{
  "doctypes": ["invoice", "receipt", "contract", "..."],
  "countries": ["PT", "ES", "FR", "..."]
}
```

#### `POST /get-schema` — Get JSON Schema for Document Type
Parameters: `docType`, `country`

```json
{
  "schemaJson": "{...JSON Schema...}",
  "docType": "invoice",
  "country": "PT",
  "version": "1.0"
}
```

#### `POST /get-generated-schema` — Generate Schema via LLM
Same response as /get-schema.

#### `GET /test/labels` — Test: List Labels (dev only)
#### `GET /test/schema?docType=invoice&country=PT` — Test: Get Schema (dev only)

---

## 5. Customer Portal API

**Base URL:** `http://localhost:5001` (dev)
**Auth:** Bearer JWT (except auth endpoints)

### 5.1 Authentication

#### `GET /api/auth/google/login` — Initiate Google OAuth
Redirects to Google consent screen.

#### `GET /api/auth/google/callback` — Google OAuth Callback
Query: `code`, `state`. Redirects with token cookie.

#### `POST /api/auth/google/token` — Google Token Login
```json
{ "idToken": "google-id-token-string" }
```
**Response:**
```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

#### `GET /api/auth/microsoft/login` — Initiate Microsoft OAuth
#### `GET /api/auth/microsoft/callback` — Microsoft OAuth Callback

#### `POST /api/auth/refresh` — Refresh Access Token
Auth: refresh token. Returns new JWT pair.

#### `GET /api/auth/dev-token` — Dev Token (dev only)

### 5.2 Users

All require Bearer JWT.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/users/me` | Current user profile | Any |
| `GET` | `/api/users/{id}` | Get user by ID | Any |
| `GET` | `/api/users/organization/{orgId}` | List org users | Any |
| `POST` | `/api/users` | Create user | Admin/Owner |
| `PUT` | `/api/users/{id}` | Update user | Admin/Owner |
| `DELETE` | `/api/users/{id}` | Delete user | Admin/Owner |

**User object:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "John Doe",
  "provider": "google",
  "organizationId": "uuid",
  "role": "Owner|Admin|Member"
}
```

### 5.3 Organizations

All require Bearer JWT.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/organizations` | List organizations | Any |
| `GET` | `/api/organizations/{id}` | Get by ID | Any |
| `GET` | `/api/organizations/slug/{slug}` | Get by slug | Any |
| `POST` | `/api/organizations` | Create organization | Any |
| `PUT` | `/api/organizations/{id}` | Update organization | Admin/Owner |
| `DELETE` | `/api/organizations/{id}` | Delete organization | Owner |

**Organization object:**
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "creditBalance": 1000.0,
  "isActive": true
}
```

### 5.4 API Keys

All require Bearer JWT.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/apikeys/organization/{orgId}` | List keys for org |
| `GET` | `/api/apikeys/{id}` | Get key by ID |
| `POST` | `/api/apikeys` | Create new key |
| `POST` | `/api/apikeys/{id}/revoke` | Revoke key |
| `POST` | `/api/apikeys/{id}/rotate` | Rotate key |

**Create request:**
```json
{
  "organizationId": "uuid",
  "name": "Production API Key",
  "expiresAt": "2025-01-15T10:30:00Z",
  "dailyLimit": 10000
}
```

**Create response** (full key shown only at creation):
```json
{
  "id": "uuid",
  "name": "Production API Key",
  "key": "dd_live_abc123xyz789...",
  "keyPrefix": "dd_live_abc",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### 5.5 Credits

All require Bearer JWT.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/credits/organization/{orgId}/balance` | Get balance |
| `GET` | `/api/credits/organization/{orgId}/transactions` | List transactions |
| `GET` | `/api/credits/organization/{orgId}/check?amount=10` | Check sufficient |
| `POST` | `/api/credits/organization/{orgId}/add` | Add credits (Admin/Owner) |
| `POST` | `/api/credits/organization/{orgId}/try-charge` | Try charge credits |

**Balance response:**
```json
{
  "organizationId": "uuid",
  "currentBalance": 1500.0,
  "totalAdded": 5000.0,
  "totalConsumed": 3500.0,
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

**Try-charge result states:**
- `Success` — Balance >= requested amount
- `Warning` — Balance > 0 but < requested (overdraft allowed)
- `Fail` — Balance <= 0 (no charge)

### 5.6 Audit

All require Bearer JWT.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/audit/organization/{orgId}` | List audit logs |
| `GET` | `/api/audit/{id}` | Get audit entry |
| `POST` | `/api/audit` | Create entry (system only) |

Query params for list: `page`, `pageSize`, `action`, `startDate`, `endDate`

### 5.7 Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Full health check (DB, cache) |
| `GET` | `/health/live` | None | Liveness probe |
| `GET` | `/health/ready` | None | Readiness probe |

---

## 6. Endpoint Summary

| Service | Base URL | Endpoints | Auth |
|---------|----------|-----------|------|
| Sync API | `apix.docdigitizer.com/sync` | 2 | X-API-Key |
| DocWorker | `docworker.europe-southwest1.run.app` | 5 | X-API-Key |
| Classifier | `classifier.europe-southwest1.run.app` | 4 | X-API-Key |
| Plugins | Internal (ports 5010-5021) | ~9 per plugin | Internal |
| Customer Portal | TBD | 27+ | JWT Bearer |
| **Total** | | **50+** | |

## 7. Document Schemas

### Supported Document Types
Invoice, Receipt, Contract, CV/Resume, ID Document, Bank Statement

### Country Support
PT (Portugal), ES (Spain), FR (France), and others.

### Invoice Extraction Example
```json
{
  "invoiceNumber": "INV-2024-001",
  "invoiceDate": "2024-01-15",
  "vendorName": "Acme Corp",
  "vendorNIF": "123456789",
  "totalAmount": 1250.00,
  "currency": "EUR",
  "lineItems": [
    {
      "description": "Product A",
      "quantity": 2,
      "unitPrice": 500.00,
      "total": 1000.00
    }
  ]
}
```
