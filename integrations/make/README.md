# Make (Integromat) DocDigitizer Integration

[Make](https://www.make.com/) integration for the [DocDigitizer](https://docdigitizer.com) document processing API.

Process PDF documents and get structured data back — OCR, classification, and extraction for invoices, receipts, contracts, CVs, ID documents, and bank statements.

## Overview

Make apps are configured via JSON in the [Make Developer Hub](https://www.make.com/en/developer-hub) — there is no npm package. This directory contains the JSON configuration templates ready to be imported into Make.

## Modules

### Process Document (Action)

Upload and process a PDF document. Returns document type, confidence score, country code, and extracted fields.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| File | buffer | Yes | The PDF file to process |
| File Name | text | No | Name of the file being uploaded |
| Pipeline | text | No | Pipeline name for processing |

**Output:**
| Field | Description |
|-------|-------------|
| `state` | Processing state (e.g., "COMPLETED") |
| `traceId` | Request trace ID |
| `numPages` | Number of pages in the PDF |
| `extractions` | Array of extraction results |

### Health Check (Action)

Check if the DocDigitizer API is healthy and responsive.

**Output:**
| Field | Description |
|-------|-------------|
| `status` | "alive" |
| `message` | Health check response message |

## Setup Guide

### 1. Create App in Make Developer Hub

1. Go to [Make Developer Hub](https://www.make.com/en/developer-hub)
2. Click **Create a new app**
3. Enter app name: **DocDigitizer**

### 2. Configure Base Settings

Copy the contents of `app/base.json` into the app's base configuration.

### 3. Configure Connection

Copy the contents of `app/common.json` to set up the API Key connection.

### 4. Add Modules

For each module in `app/modules/`:
1. Create a new module in the Make Developer Hub
2. Copy the JSON configuration
3. Test the module with a sample PDF

### 5. Submit for Review

Once all modules are configured and tested, submit the app for Make's review process.

## File Structure

```
integrations/make/
├── sdk-manifest.yaml           # Operations manifest
├── README.md                   # This file
├── package.json                # For running contract tests
├── app/
│   ├── base.json               # App metadata
│   ├── common.json             # Connection & auth config
│   └── modules/
│       ├── processDocument.json  # Process Document module
│       └── healthCheck.json      # Health Check module
└── tests/
    └── contract.test.js         # Contract tests
```

## Development

```bash
npm install
npm test
```

## Links

- [DocDigitizer](https://docdigitizer.com)
- [All SDKs & Integrations](https://github.com/DocDigitizer/dd-v3-integrations)
- [Make Developer Hub](https://www.make.com/en/developer-hub)

## License

MIT
