# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-03-03

### Breaking Changes

- **New API endpoint:** Process document moved from `POST https://apix.docdigitizer.com/sync` to `POST https://api.docdigitizer.com/v3/docingester/extract`
- **New base URL:** All SDKs and integrations now default to `https://api.docdigitizer.com/v3/docingester`
- **Health check:** Now at `GET https://api.docdigitizer.com/v3/docingester/`

### Changed

- All 5 SDKs (Python, Node.js, Go, C#, Rust) updated to new endpoint
- All 9 integrations (LangChain Python/JS, LlamaIndex, Vercel AI, MCP Server, n8n, Zapier, Make, Claude Plugin) updated to new endpoint
- OpenAPI spec bumped to v1.1.0 with new server URLs and `/extract` path
- `sdk-config.yaml` and all `sdk-manifest.yaml` files updated to api_version 1.1.0

### Deprecated

- **v0.1.x packages** — All v0.1.x packages point to the legacy endpoint (`https://apix.docdigitizer.com/sync`) which will be removed in a future release. Upgrade to v0.2.0+.

### Migration Guide

Update your package to v0.2.0:

```bash
# Python
pip install --upgrade docdigitizer

# Node.js
npm install docdigitizer@latest

# Go
go get github.com/DocDigitizer/dd-v3-integrations/sdks/go@latest

# C#
dotnet add package DocDigitizer --version 0.2.0

# Rust
cargo update -p docdigitizer
```

If you use a custom `base_url`, update it from `https://apix.docdigitizer.com/sync` to `https://api.docdigitizer.com/v3/docingester`.

## [0.1.0] - 2026-02-28

### Added

- Initial release of all SDKs and integrations
- Python SDK (`docdigitizer` on PyPI)
- Node.js SDK (`docdigitizer` on npm)
- Go SDK
- C# SDK (`DocDigitizer` on NuGet)
- Rust SDK (`docdigitizer` on crates.io)
- LangChain Python integration (`langchain-docdigitizer`)
- LangChain JS integration (`@docdigitizer/langchain`)
- LlamaIndex integration (`llama-index-readers-docdigitizer`)
- Vercel AI SDK integration (`docdigitizer-ai`)
- MCP Server (`@docdigitizer/mcp-server`)
- Claude Plugin
- n8n integration (`n8n-nodes-docdigitizer`)
- Zapier integration
- Make integration
- OpenAPI 3.1 specification (v1.0.0)
- Contract tests validating SDKs against OpenAPI spec
- CI/CD pipelines for all packages
