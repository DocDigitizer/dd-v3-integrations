# llama-index-readers-docdigitizer

LlamaIndex reader for the [DocDigitizer](https://docdigitizer.com) document processing API.

> **v0.1.x is deprecated.** Upgrade to v0.2.0+ for the new API endpoint. The previous endpoint (`https://apix.docdigitizer.com/sync`) will be removed in a future release.

## Installation

```bash
pip install llama-index-readers-docdigitizer
```

## Usage

```python
from llama_index.readers.docdigitizer import DocDigitizerReader

# Load a single PDF
reader = DocDigitizerReader(api_key="dd_live_...")
documents = reader.load_data(file_path="invoice.pdf")

print(documents[0].text)          # JSON with extracted fields
print(documents[0].metadata)      # document_type, confidence, etc.

# Load all PDFs from a directory
documents = reader.load_data(file_path="invoices/")

# Use in a RAG pipeline
from llama_index.core import VectorStoreIndex

index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()
response = query_engine.query("What is the invoice total?")
```

## Configuration

| Parameter | Environment Variable | Default |
|-----------|---------------------|---------|
| `api_key` | `DOCDIGITIZER_API_KEY` | — |
| `base_url` | `DOCDIGITIZER_BASE_URL` | `https://api.docdigitizer.com/v3/docingester` |
| `timeout` | `DOCDIGITIZER_TIMEOUT` | `300` |
| `max_retries` | — | `3` |
| `pipeline` | — | `None` |
| `content_format` | — | `"json"` |

### Content Formats

- `"json"` (default): Document text is a JSON string of extracted fields
- `"text"`: Key-value pairs separated by newlines (`key: value`)
- `"kv"`: `key=value` pairs separated by newlines

## Document Metadata

Each LlamaIndex `Document` includes metadata:

| Field | Type | Description |
|-------|------|-------------|
| `source` | `str` | File path of the processed PDF |
| `document_type` | `str` | Detected document type (e.g., "Invoice") |
| `confidence` | `float` | Classification confidence (0-1) |
| `country_code` | `str` | Detected country code (e.g., "PT") |
| `pages` | `list[int]` | Page numbers where document was found |
| `trace_id` | `str` | Unique trace identifier |

## License

MIT
