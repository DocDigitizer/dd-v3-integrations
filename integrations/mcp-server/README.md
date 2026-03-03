# @docdigitizer/mcp-server

MCP (Model Context Protocol) server for the DocDigitizer document processing API. Enables Claude Desktop and Claude Code to process PDFs and extract structured data directly.

> **v0.1.x is deprecated.** Upgrade to v0.2.0+ for the new API endpoint. The previous endpoint (`https://apix.docdigitizer.com/sync`) will be removed in a future release.

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "docdigitizer": {
      "command": "npx",
      "args": ["-y", "@docdigitizer/mcp-server"],
      "env": {
        "DOCDIGITIZER_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Code

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "docdigitizer": {
      "command": "npx",
      "args": ["-y", "@docdigitizer/mcp-server"],
      "env": {
        "DOCDIGITIZER_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Tools

### `health_check`

Check if the DocDigitizer API is available.

**Parameters:** None

**Example prompt:** "Check if DocDigitizer is healthy"

### `process_document`

Upload and process a PDF document. Extracts structured data from invoices, receipts, contracts, CVs, IDs, and bank statements.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file_path` | string | One of file_path or file_content | Absolute path to a local PDF file |
| `file_content` | string | One of file_path or file_content | Base64-encoded PDF content |
| `file_name` | string | No | Filename hint |
| `document_id` | string (UUID) | No | Document UUID for tracking |
| `context_id` | string (UUID) | No | Context UUID for grouping |
| `pipeline` | string | No | Processing pipeline name |
| `request_token` | string | No | Trace token (max 7 chars) |

**Example prompts:**
- "Process the invoice at C:/Documents/invoice.pdf"
- "Extract data from the PDF at /home/user/receipt.pdf"

## Configuration

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `DOCDIGITIZER_API_KEY` | Yes | — | Your DocDigitizer API key |
| `DOCDIGITIZER_BASE_URL` | No | `https://api.docdigitizer.com/v3/docingester` | API base URL |
| `DOCDIGITIZER_TIMEOUT` | No | `300000` (5 min) | Request timeout in ms |

## Development

```bash
npm install
npm run build
npm test
```

### Testing with MCP Inspector

```bash
DOCDIGITIZER_API_KEY=your-key npx @modelcontextprotocol/inspector node dist/index.js
```

## License

MIT
