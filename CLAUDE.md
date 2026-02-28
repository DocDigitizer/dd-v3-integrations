# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Official SDKs and integrations for the DocDigitizer Document Processing API. DocDigitizer provides intelligent document processing: upload PDFs and get structured data back (OCR, classification, extraction) for invoices, receipts, contracts, CVs, ID documents, and bank statements.

## Repository Structure

Monorepo with independent packages — each SDK/integration has its own build system, package manager, and tests.

- `sdks/python/` — Python SDK (`docdigitizer` on PyPI)
- `sdks/node/` — Node.js/TypeScript SDK (`@docdigitizer/sdk` on npm)
- `sdks/go/` — Go SDK
- `sdks/csharp/` — C#/.NET SDK (`DocDigitizer.SDK` on NuGet)
- `sdks/rust/` — Rust SDK (`docdigitizer` on crates.io)
- `integrations/langchain/` — LangChain document loader (Python + JS)
- `integrations/llamaindex/` — LlamaIndex data reader
- `integrations/vercel-ai/` — Vercel AI SDK provider
- `integrations/mcp-server/` — Model Context Protocol server
- `integrations/n8n/` — n8n community node
- `integrations/zapier/` — Zapier integration
- `integrations/make/` — Make (Integromat) module

## API Quick Reference

**Base URL:** `https://apix.docdigitizer.com/sync`
**Auth:** `X-API-Key` header

Primary endpoint: `POST /` with `multipart/form-data` (fields: `files`, `id`, `contextID`). Returns JSON with `StateText`, `Output.extractions[]` containing `documentType`, `confidence`, `countryCode`, `extraction`.

Full API reference: `docs/api-reference.md`
Integration plan & priority: `docs/INTEGRATION-PLAN.md`

## Design Principles

- Consistent method names across all SDKs (adapted to language idioms)
- Typed responses — models/structs, not raw dicts
- Async-first where the language supports it
- Accept file paths, byte arrays, streams, and buffers
- Error hierarchy: AuthenticationError, ValidationError, RateLimitError, ServerError, TimeoutError
- Built-in retry with backoff for 5xx and 429
- Configurable base URL for self-hosted instances
- Minimal dependencies per package
