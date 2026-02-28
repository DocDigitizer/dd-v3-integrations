# DocDigitizer Plugin for Claude Code

Process PDF documents and extract structured data directly from Claude Code.

## Installation

### From the marketplace

```
/plugin install docdigitizer@docdigitizer-plugins
```

### Manual (for development)

```bash
claude --plugin-dir ./integrations/claude-plugin
```

## Setup

Set your API key as an environment variable:

```bash
export DOCDIGITIZER_API_KEY=your-api-key
```

## Usage

Once installed, Claude can automatically process documents when you ask:

- "Process the invoice at /path/to/invoice.pdf"
- "Extract data from this PDF"
- "Check if DocDigitizer is working"

Or use the skills directly:

```
/docdigitizer:process-document /path/to/invoice.pdf
/docdigitizer:health-check
```

## What it extracts

- **Invoices**: document number, dates, supplier, amounts, line items, tax info
- **Receipts**: merchant, total, date, payment method
- **Contracts**: parties, dates, terms
- **CVs/Resumes**: personal info, experience, education
- **ID Documents**: name, document number, dates, nationality
- **Bank Statements**: account info, transactions, balances

## Requirements

- Node.js 18+ (for the MCP server)
- DocDigitizer API key
