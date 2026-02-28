import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const OPENAPI_SPEC_PATH = resolve(REPO_ROOT, "openapi", "sync.openapi.yaml");
const SDK_MANIFEST_PATH = resolve(__dirname, "..", "sdk-manifest.yaml");

function loadYaml(path: string): Record<string, unknown> {
  return parseYaml(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

function getSpecOperationIds(spec: Record<string, unknown>): Set<string> {
  const ids = new Set<string>();
  const paths = spec.paths as Record<string, Record<string, Record<string, unknown>>> | undefined;
  if (!paths) return ids;
  for (const methods of Object.values(paths)) {
    for (const operation of Object.values(methods)) {
      if (operation && typeof operation === "object" && "operationId" in operation) {
        ids.add(operation.operationId as string);
      }
    }
  }
  return ids;
}

describe("Contract: SDK manifest matches OpenAPI spec", () => {
  const spec = loadYaml(OPENAPI_SPEC_PATH);
  const manifest = loadYaml(SDK_MANIFEST_PATH);
  const specOperationIds = getSpecOperationIds(spec);

  it("all manifest operations exist in the OpenAPI spec", () => {
    const operations = (manifest as Record<string, unknown>).operations as Array<{
      operationId: string;
    }>;
    for (const op of operations) {
      expect(specOperationIds.has(op.operationId)).toBe(true);
    }
  });

  it("api_version matches spec version", () => {
    const sdk = (manifest as Record<string, unknown>).sdk as Record<string, unknown>;
    const specInfo = spec.info as Record<string, unknown>;
    expect(sdk.api_version).toBe(specInfo.version);
  });

  it("ProcessingResponse schema has required fields", () => {
    const schemas = (
      spec.components as Record<string, unknown>
    ).schemas as Record<string, Record<string, unknown>>;
    const responseSchema = schemas.ProcessingResponse;
    const required = responseSchema.required as string[];
    expect(required).toContain("StateText");
    expect(required).toContain("TraceId");
  });

  it("Extraction schema has expected properties", () => {
    const schemas = (
      spec.components as Record<string, unknown>
    ).schemas as Record<string, Record<string, unknown>>;
    const extractionSchema = schemas.Extraction;
    const props = Object.keys(
      extractionSchema.properties as Record<string, unknown>
    );
    expect(props).toContain("documentType");
    expect(props).toContain("confidence");
    expect(props).toContain("countryCode");
    expect(props).toContain("pageRange");
    expect(props).toContain("extraction");
  });
});
