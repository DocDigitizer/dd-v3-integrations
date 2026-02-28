"""LlamaIndex reader for DocDigitizer.

Usage::

    from llama_index.readers.docdigitizer import DocDigitizerReader

    reader = DocDigitizerReader(api_key="your-api-key")
    documents = reader.load_data(file_path="invoice.pdf")
"""

from llama_index.readers.docdigitizer.base import DocDigitizerReader

__all__ = ["DocDigitizerReader"]
