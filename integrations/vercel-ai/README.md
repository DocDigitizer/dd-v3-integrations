# docdigitizer-ai

[Vercel AI SDK](https://ai-sdk.dev) tools for the [DocDigitizer](https://docdigitizer.com) document processing API.

## Installation

```bash
npm install docdigitizer-ai ai
```

## Usage

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { processDocumentTool, healthCheckTool } from 'docdigitizer-ai';

const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Process the invoice at /tmp/invoice.pdf and summarize it',
  tools: {
    processDocument: processDocumentTool({ apiKey: 'dd_live_...' }),
    healthCheck: healthCheckTool({ apiKey: 'dd_live_...' }),
  },
});
```

## Tools

### `processDocumentTool`

Processes a PDF document and returns extracted structured data.

**Parameters (defined via Zod schema):**
- `filePath` (required): Absolute path to the PDF file
- `pipeline` (optional): Pipeline name for processing

**Returns:**
```json
{
  "state": "COMPLETED",
  "traceId": "ABC1234",
  "numPages": 2,
  "extractions": [
    {
      "documentType": "Invoice",
      "confidence": 0.95,
      "countryCode": "PT",
      "pages": [1, 2],
      "data": { "invoice_number": "INV-001", "total": "1000.00" }
    }
  ]
}
```

### `healthCheckTool`

Checks if the DocDigitizer API is available.

**Returns:**
```json
{ "status": "ok", "message": "I am alive" }
```

## Configuration

```typescript
processDocumentTool({
  apiKey: 'dd_live_...',          // or set DOCDIGITIZER_API_KEY env var
  baseUrl: 'https://custom.api',  // optional
  timeout: 300000,                 // optional (ms)
  maxRetries: 3,                   // optional
});
```

## License

MIT
