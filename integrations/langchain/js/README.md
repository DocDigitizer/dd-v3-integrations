# @docdigitizer/langchain

LangChain document loader for the [DocDigitizer](https://docdigitizer.com) document processing API.

## Installation

```bash
npm install @docdigitizer/langchain @langchain/core
```

## Usage

```typescript
import { DocDigitizerLoader } from '@docdigitizer/langchain';

// Load a single PDF
const loader = new DocDigitizerLoader('invoice.pdf', { apiKey: 'dd_live_...' });
const docs = await loader.load();

console.log(docs[0].pageContent);       // JSON with extracted fields
console.log(docs[0].metadata);          // documentType, confidence, etc.

// Load all PDFs from a directory
const dirLoader = new DocDigitizerLoader('invoices/', { apiKey: 'dd_live_...' });
const allDocs = await dirLoader.load();
```

## Configuration

```typescript
const loader = new DocDigitizerLoader('invoice.pdf', {
  apiKey: 'dd_live_...',          // or set DOCDIGITIZER_API_KEY env var
  baseUrl: 'https://custom.api',  // optional
  timeout: 300000,                 // optional (ms)
  maxRetries: 3,                   // optional
  pipeline: 'CustomPipeline',     // optional
  contentFormat: 'json',           // "json" | "text" | "kv"
});
```

## Document Metadata

Each LangChain `Document` includes metadata:

| Field | Type | Description |
|-------|------|-------------|
| `source` | `string` | File path of the processed PDF |
| `documentType` | `string` | Detected document type (e.g., "Invoice") |
| `confidence` | `number` | Classification confidence (0-1) |
| `countryCode` | `string` | Detected country code (e.g., "PT") |
| `pages` | `number[]` | Page numbers where document was found |
| `traceId` | `string` | Unique trace identifier |

## License

MIT
