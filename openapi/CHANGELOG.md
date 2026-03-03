# OpenAPI Spec Changelog

All changes to the DocDigitizer API specification are documented here.

## [1.1.0] - 2026-03-03

### Breaking: Endpoint migration
- **New base URL:** `https://api.docdigitizer.com/v3/docingester`
- Process document moved from `POST /` to `POST /extract`
- Health check moved from `GET /` (old base) to `GET /` (new base)
- Previous endpoint (`https://apix.docdigitizer.com/sync`) is now deprecated and listed as legacy server
- All SDKs and integrations bumped to v0.2.0 with the new default base URL

## [1.0.0] - 2026-02-28

### Initial spec
- Copied from sync2025 (`docs/openapi/sync.openapi.yaml`)
- Operations: `checkHealth` (GET /), `processDocument` (POST /)
- Auth: X-API-Key header
- Schemas: ProcessingResponse, ProcessingOutput, Extraction, ErrorResponse
