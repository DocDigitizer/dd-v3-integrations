# langchain-docdigitizer

LangChain document loader for the [DocDigitizer](https://docdigitizer.com) document processing API.

> **v0.1.x is deprecated.** Upgrade to v0.2.0+ for the new API endpoint. The previous endpoint (`https://apix.docdigitizer.com/sync`) will be removed in a future release.

## Installation

```bash
pip install langchain-docdigitizer
```

## Usage

```python
from langchain_docdigitizer import DocDigitizerLoader

# Load a single PDF
loader = DocDigitizerLoader(api_key="dd_live_...")
docs = loader.load("invoice.pdf")

print(docs[0].page_content)       # JSON with extracted fields
print(docs[0].metadata)           # document_type, confidence, country_code, etc.

# Load all PDFs from a directory
loader = DocDigitizerLoader(api_key="dd_live_...", file_path="invoices/")
docs = loader.load()

# Use in a RAG pipeline
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

splitter = RecursiveCharacterTextSplitter(chunk_size=1000)
chunks = splitter.split_documents(docs)
vectorstore = FAISS.from_documents(chunks, OpenAIEmbeddings())
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

- `"json"` (default): `page_content` is a JSON string of extracted fields
- `"text"`: `page_content` is key-value pairs separated by newlines (`key: value`)
- `"kv"`: `page_content` is `key=value` pairs separated by newlines

## Document Metadata

Each LangChain `Document` includes metadata:

| Field | Type | Description |
|-------|------|-------------|
| `source` | `str` | File path of the processed PDF |
| `document_type` | `str` | Detected document type (e.g., "Invoice") |
| `confidence` | `float` | Classification confidence (0-1) |
| `country_code` | `str` | Detected country code (e.g., "PT") |
| `pages` | `list[int]` | Page numbers where document was found |
| `page_range` | `dict` | Start/end page range |
| `trace_id` | `str` | Unique trace identifier |

## License

MIT
