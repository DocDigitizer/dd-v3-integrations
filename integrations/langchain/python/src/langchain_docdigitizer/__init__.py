"""LangChain document loader for DocDigitizer.

Usage::

    from langchain_docdigitizer import DocDigitizerLoader

    loader = DocDigitizerLoader(api_key="your-api-key")
    docs = loader.load("invoice.pdf")
"""

from langchain_docdigitizer.document_loader import DocDigitizerLoader

__version__ = "0.1.0"
__all__ = ["DocDigitizerLoader"]
