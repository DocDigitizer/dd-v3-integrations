# n8n-nodes-docdigitizer

[n8n](https://n8n.io/) community node for the [DocDigitizer](https://docdigitizer.com) document processing API.

Process PDF documents and get structured data back — OCR, classification, and extraction for invoices, receipts, contracts, CVs, ID documents, and bank statements.

> **v0.1.x is deprecated.** Upgrade to v0.2.0+ for the new API endpoint. The previous endpoint (`https://apix.docdigitizer.com/sync`) will be removed in a future release.

## Installation

### Via n8n Community Nodes

1. Go to **Settings → Community Nodes**
2. Click **Install a community node**
3. Enter `n8n-nodes-docdigitizer`
4. Click **Install**

### Via npm (self-hosted)

```bash
npm install n8n-nodes-docdigitizer
```

## Setup

1. In n8n, go to **Credentials → Add Credential**
2. Search for **DocDigitizer API**
3. Enter your API key
4. (Optional) Change the Base URL for self-hosted instances

## Operations

### Document

| Operation | Description |
|-----------|-------------|
| **Process** | Upload and process a PDF document — returns document type, confidence, country, and extracted fields |

### Health

| Operation | Description |
|-----------|-------------|
| **Check** | Check if the DocDigitizer API is healthy and responsive |

## Usage

### Process a Document

1. Add a node that produces a binary PDF file (e.g., **HTTP Request**, **Read Binary File**)
2. Connect it to the **DocDigitizer** node
3. Set **Resource** to `Document` and **Operation** to `Process`
4. Set **Binary Property** to the name of the binary property (default: `data`)
5. Optionally set a **Pipeline** name

### Output

The node outputs JSON with the following structure:

```json
{
  "state": "COMPLETED",
  "traceId": "abc-123",
  "numPages": 2,
  "extractions": [
    {
      "documentType": "Invoice",
      "confidence": 0.95,
      "countryCode": "PT",
      "pages": [1, 2],
      "pageRange": { "start": 1, "end": 2 },
      "extraction": {
        "invoiceNumber": "INV-001",
        "totalAmount": 1500.00,
        "currency": "EUR"
      }
    }
  ]
}
```

## Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| API Key | Your DocDigitizer API key | (required) |
| Base URL | API endpoint | `https://api.docdigitizer.com/v3/docingester` |

Environment variables are also supported via the DocDigitizer SDK:
- `DOCDIGITIZER_API_KEY`
- `DOCDIGITIZER_BASE_URL`
- `DOCDIGITIZER_TIMEOUT`

## Development

```bash
npm install
npm run build
npm test
```

## Links

- [DocDigitizer](https://docdigitizer.com)
- [All SDKs & Integrations](https://github.com/DocDigitizer/dd-v3-integrations)
- [API Documentation](https://github.com/DocDigitizer/dd-v3-integrations/blob/main/docs/api-reference.md)

## License

MIT
