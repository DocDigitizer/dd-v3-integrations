const { readFileSync } = require("fs");
const { join } = require("path");
const { parse } = require("yaml");

function loadYaml(path) {
  return parse(readFileSync(path, "utf-8"));
}

describe("Contract Tests", () => {
  const manifestPath = join(__dirname, "..", "sdk-manifest.yaml");
  const specPath = join(__dirname, "..", "..", "..", "openapi", "sync.openapi.yaml");

  const manifest = loadYaml(manifestPath);

  let spec;
  try {
    spec = loadYaml(specPath);
  } catch {
    spec = null;
  }

  it("manifest has operations", () => {
    expect(manifest.operations).toBeDefined();
    expect(manifest.operations.length).toBeGreaterThan(0);
  });

  it("manifest operations match OpenAPI spec", () => {
    if (!spec) return;

    const specOperationIds = new Set();
    for (const pathItem of Object.values(spec.paths ?? {})) {
      for (const methodData of Object.values(pathItem)) {
        if (
          typeof methodData === "object" &&
          methodData !== null &&
          "operationId" in methodData
        ) {
          specOperationIds.add(methodData.operationId);
        }
      }
    }

    for (const op of manifest.operations) {
      expect(specOperationIds.has(op.operationId)).toBe(true);
    }
  });

  it("manifest api_version is correct", () => {
    expect(manifest.sdk.api_version).toBe("1.1.0");
  });

  it("manifest type is integration", () => {
    expect(manifest.sdk.type).toBe("integration");
    expect(manifest.sdk.framework).toBe("zapier");
  });
});
