---
name: process-document
description: Process a PDF document with DocDigitizer to extract structured data (invoices, receipts, contracts, CVs, IDs, bank statements). Use when the user wants to extract data from a PDF, process an invoice, or analyze a document.
---

# Process Document

Use the `process_document` MCP tool from the docdigitizer server to process the PDF document.

If the user provides a file path, pass it as `file_path`.
If the user provides base64 content, pass it as `file_content`.

After processing, present the results in a clear, structured format:
- Document type and confidence
- Country code
- Key extracted fields (e.g., document number, dates, amounts, supplier info)
- Page range

If the processing fails, explain the error clearly and suggest fixes.
