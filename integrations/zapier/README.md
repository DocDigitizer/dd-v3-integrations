# Zapier DocDigitizer Integration

[Zapier](https://zapier.com) integration for the [DocDigitizer](https://docdigitizer.com) document processing API.

Process PDF documents and get structured data back — OCR, classification, and extraction for invoices, receipts, contracts, CVs, ID documents, and bank statements.

## Actions

### Process Document

Upload and process a PDF document. Returns document type, confidence score, country code, and extracted fields.

**Input Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| File | file | Yes | The PDF file to process |
| File Name | string | No | Override the file name |
| Pipeline | string | No | Pipeline name for processing |

**Output Fields:**
| Field | Description |
|-------|-------------|
| `state` | Processing state (e.g., "COMPLETED") |
| `traceId` | Request trace ID |
| `numPages` | Number of pages in the PDF |
| `extractions[].documentType` | Detected document type |
| `extractions[].confidence` | Confidence score (0-1) |
| `extractions[].countryCode` | Country code |
| `extractions[].extraction` | Extracted structured data |

### Health Check

Check if the DocDigitizer API is healthy and responsive. Available as a hidden search for testing connectivity.

## Authentication

The integration uses API Key authentication:

1. Get your API key from [DocDigitizer](https://docdigitizer.com)
2. Enter the API key when connecting the integration
3. Optionally change the Base URL for self-hosted instances

## Example Workflow

1. **Trigger**: New file in Google Drive / Dropbox / Email attachment
2. **Action**: DocDigitizer → Process Document
3. **Action**: Google Sheets → Add row with extracted data

## Development

```bash
npm install
npm test
```

### Publishing

Requires [Zapier CLI](https://platform.zapier.com/docs/cli):

```bash
npx zapier login
npx zapier register "DocDigitizer"
npx zapier push
npx zapier promote <version> --all-users
```

## Links

- [DocDigitizer](https://docdigitizer.com)
- [All SDKs & Integrations](https://github.com/DocDigitizer/dd-v3-integrations)
- [Zapier Developer Platform](https://platform.zapier.com/)

## License

MIT
