# DocDigitizer Node.js/TypeScript SDK

Official Node.js/TypeScript SDK for the [DocDigitizer](https://www.docdigitizer.com) document processing API.

## Installation

```bash
npm install docdigitizer
```

## Quick Start

```typescript
import { DocDigitizer } from 'docdigitizer';

const dd = new DocDigitizer({ apiKey: 'your-api-key' });

// Process a PDF
const result = await dd.process('/path/to/invoice.pdf');
console.log(result.state);                              // "COMPLETED"
console.log(result.output?.extractions[0].documentType); // "Invoice"
console.log(result.output?.extractions[0].extraction);   // { DocumentNumber: "INV-001", ... }

// Health check
const status = await dd.healthCheck();
console.log(status); // "I am alive"
```

## Configuration

```typescript
// Option 1: Pass API key directly
const dd = new DocDigitizer('your-api-key');

// Option 2: Pass options object
const dd = new DocDigitizer({
  apiKey: 'your-api-key',
  baseUrl: 'https://apix.docdigitizer.com/sync', // default
  timeout: 300_000,  // 5 minutes (default)
  maxRetries: 3,     // default
});

// Option 3: Environment variables
// DOCDIGITIZER_API_KEY=your-api-key
// DOCDIGITIZER_BASE_URL=https://apix.docdigitizer.com/sync (optional)
// DOCDIGITIZER_TIMEOUT=300000 (optional)
const dd = new DocDigitizer();
```

## Processing Documents

```typescript
// From file path
const result = await dd.process('/path/to/document.pdf');

// From Buffer
const buffer = await fs.readFile('document.pdf');
const result = await dd.process({ fileContent: buffer, fileName: 'document.pdf' });

// With options
const result = await dd.process({
  filePath: '/path/to/document.pdf',
  pipelineIdentifier: 'MainPipelineWithOCR',
  requestToken: 'my-trace-token',
});
```

## Error Handling

```typescript
import { DocDigitizer, AuthenticationError, ValidationError } from 'docdigitizer';

try {
  const result = await dd.process('invoice.pdf');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof ValidationError) {
    console.error('Invalid request:', error.messages);
  }
}
```

### Error Types

| Error | HTTP Status | Description |
|-------|-------------|-------------|
| `ValidationError` | 400 | Invalid request |
| `AuthenticationError` | 401 | Invalid/missing API key |
| `RateLimitError` | 429 | Rate limit exceeded |
| `ServerError` | 500 | Internal server error |
| `ServiceUnavailableError` | 503 | Downstream service unavailable |
| `TimeoutError` | 504 | Processing timeout |

Retryable errors (429, 500, 503, 504) are automatically retried with exponential backoff.

## Requirements

- Node.js 18+ (uses built-in `fetch`)
- Zero runtime dependencies
