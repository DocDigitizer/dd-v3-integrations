import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MCP_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(MCP_DIR, "..", "..");
const OPENAPI_PATH = resolve(REPO_ROOT, "openapi", "sync.openapi.yaml");
const MANIFEST_PATH = resolve(MCP_DIR, "sdk-manifest.yaml");

function loadYaml(path: string): Record<string, unknown> {
  return parseYaml(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

describe("Contract: Manifest vs OpenAPI Spec", () => {
  const spec = loadYaml(OPENAPI_PATH) as any;
  const manifest = loadYaml(MANIFEST_PATH) as any;

  it("all manifest operations exist in OpenAPI spec", () => {
    const specOperationIds = new Set<string>();
    for (const methods of Object.values(spec.paths) as any[]) {
      for (const operation of Object.values(methods) as any[]) {
        if (operation?.operationId) {
          specOperationIds.add(operation.operationId);
        }
      }
    }

    for (const op of manifest.operations) {
      expect(
        specOperationIds.has(op.operationId),
        `operationId '${op.operationId}' not found in OpenAPI spec. Available: ${[...specOperationIds].join(", ")}`
      ).toBe(true);
    }
  });

  it("api_version matches spec version", () => {
    expect(manifest.sdk.api_version).toBe(spec.info.version);
  });

  it("ProcessingResponse schema properties are covered by types", () => {
    const schema = spec.components.schemas.ProcessingResponse;
    const requiredFields = new Set(schema.required ?? []);
    const typeMapping: Record<string, string> = {
      state: "StateText",
      traceId: "TraceId",
      pipeline: "Pipeline",
      numPages: "NumberPages",
      output: "Output",
      timers: "Timers",
      messages: "Messages",
    };

    for (const [tsField, apiField] of Object.entries(typeMapping)) {
      expect(
        apiField in schema.properties,
        `TypeScript field '${tsField}' maps to '${apiField}' which doesn't exist in OpenAPI schema`
      ).toBe(true);
    }

    for (const required of requiredFields) {
      expect(
        Object.values(typeMapping).includes(required),
        `Required API field '${required}' is not mapped in TypeScript types`
      ).toBe(true);
    }
  });

  it("Extraction schema properties are covered by types", () => {
    const schema = spec.components.schemas.Extraction;
    const apiProperties = new Set(Object.keys(schema.properties ?? {}));

    const typeMapping: Record<string, string> = {
      documentType: "documentType",
      confidence: "confidence",
      countryCode: "countryCode",
      pageRange: "pageRange",
      extraction: "extraction",
    };

    for (const [tsField, apiField] of Object.entries(typeMapping)) {
      expect(
        apiProperties.has(apiField),
        `TypeScript field '${tsField}' maps to '${apiField}' which doesn't exist in OpenAPI Extraction schema`
      ).toBe(true);
    }
  });
});
