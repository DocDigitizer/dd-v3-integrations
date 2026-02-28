# DocDigitizer Python SDK

Official Python client for the [DocDigitizer](https://docdigitizer.com) document processing API.

Upload PDF documents and get structured data back — invoices, receipts, contracts, CVs, ID documents, and bank statements.

## Installation

```bash
pip install docdigitizer
```

## Quick Start

```python
from docdigitizer import DocDigitizer

dd = DocDigitizer(api_key="your-api-key")

result = dd.process("invoice.pdf")

if result.is_completed:
    for extraction in result.extractions:
        print(f"Type: {extraction.document_type}")
        print(f"Confidence: {extraction.confidence}")
        print(f"Country: {extraction.country_code}")
        print(f"Data: {extraction.data}")
```

## Async Usage

```python
import asyncio
from docdigitizer import AsyncDocDigitizer

async def main():
    async with AsyncDocDigitizer(api_key="your-api-key") as dd:
        result = await dd.process("invoice.pdf")
        print(result.extractions[0].data)

asyncio.run(main())
```

## File Input Options

The `process()` method accepts multiple file input types:

```python
# From file path (string or Path)
result = dd.process("path/to/invoice.pdf")
result = dd.process(Path("path/to/invoice.pdf"))

# From bytes
with open("invoice.pdf", "rb") as f:
    result = dd.process(f.read(), filename="invoice.pdf")

# From file-like object
with open("invoice.pdf", "rb") as f:
    result = dd.process(f)
```

## Configuration

```python
dd = DocDigitizer(
    api_key="your-api-key",       # or set DOCDIGITIZER_API_KEY env var
    base_url="https://...",        # or set DOCDIGITIZER_BASE_URL env var
    timeout=300,                   # request timeout in seconds (default: 300)
    max_retries=3,                 # retries on 5xx/429 (default: 3)
)
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DOCDIGITIZER_API_KEY` | API key (used if `api_key` arg not provided) |
| `DOCDIGITIZER_BASE_URL` | Base URL override |

## Processing Options

```python
result = dd.process(
    "invoice.pdf",
    pipeline="MainPipelineWithOCR",  # or MainPipelineWithFile, SingleDocPipelineWithOCR
    id="custom-uuid",                # document ID (auto-generated if omitted)
    context_id="batch-uuid",         # grouping ID (auto-generated if omitted)
    request_token="ABC1234",         # trace token, max 7 chars
)
```

## Response Models

```python
result = dd.process("invoice.pdf")

result.state           # "COMPLETED", "PROCESSING", or "ERROR"
result.trace_id        # "ABC1234" — unique request identifier
result.pipeline        # "MainPipelineWithOCR"
result.num_pages       # 2
result.is_completed    # True
result.is_error        # False
result.messages        # ["Document processed successfully"]
result.timers          # {"DocIngester": {"total": 2345.67}}

# Extractions
for ext in result.extractions:
    ext.document_type  # "Invoice"
    ext.confidence     # 0.95
    ext.country_code   # "PT"
    ext.page_range     # PageRange(start=1, end=2)
    ext.data           # {"invoiceNumber": "INV-001", "totalAmount": 1250.00, ...}
```

## Error Handling

```python
from docdigitizer import DocDigitizer
from docdigitizer.exceptions import (
    AuthenticationError,
    ValidationError,
    ServerError,
    TimeoutError,
    ServiceUnavailableError,
    RateLimitError,
)

dd = DocDigitizer(api_key="your-api-key")

try:
    result = dd.process("invoice.pdf")
except AuthenticationError:
    print("Invalid API key")
except ValidationError as e:
    print(f"Bad request: {e.messages}")
except TimeoutError:
    print("Processing took too long")
except ServerError as e:
    print(f"Server error (trace: {e.trace_id})")
```

All exceptions inherit from `DocDigitizerError` and carry:
- `status_code` — HTTP status code
- `trace_id` — request trace ID (for support)
- `messages` — error detail messages
- `timers` — processing time metrics

## Health Check

```python
status = dd.health_check()  # "I am alive"
```

## Supported Operations

This SDK supports the following API operations (defined in `sdk-manifest.yaml`):

| Method | API Operation | Description |
|--------|--------------|-------------|
| `dd.process()` | `processDocument` | Upload and process a PDF |
| `dd.health_check()` | `checkHealth` | Check API availability |

## Development

```bash
cd sdks/python
pip install -e ".[dev]"

# Run tests
pytest tests/ -m "not integration" -v

# Run with live API
DD_API_KEY=your-key pytest tests/test_integration.py -v

# Lint
ruff check src/ tests/
ruff format src/ tests/
```

## Requirements

- Python >= 3.8
- httpx >= 0.24.0
