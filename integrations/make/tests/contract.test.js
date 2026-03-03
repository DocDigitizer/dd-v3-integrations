const { describe, it } = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { parse } = require("yaml");

function loadYaml(path) {
  return parse(readFileSync(path, "utf-8"));
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
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
    assert.ok(manifest.operations);
    assert.ok(manifest.operations.length > 0);
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
      assert.ok(
        specOperationIds.has(op.operationId),
        `Operation ${op.operationId} not found in spec`,
      );
    }
  });

  it("manifest api_version is correct", () => {
    assert.strictEqual(manifest.sdk.api_version, "1.1.0");
  });

  it("manifest type is integration", () => {
    assert.strictEqual(manifest.sdk.type, "integration");
    assert.strictEqual(manifest.sdk.framework, "make");
  });
});

describe("JSON Configuration Tests", () => {
  it("base.json is valid", () => {
    const base = loadJson(join(__dirname, "..", "app", "base.json"));
    assert.ok(base.baseUrl);
    assert.ok(base.label);
    assert.ok(base.description);
  });

  it("common.json has connection config", () => {
    const common = loadJson(join(__dirname, "..", "app", "common.json"));
    assert.ok(common.connection);
    assert.strictEqual(common.connection.type, "apiKey");
    assert.ok(common.headers["X-API-Key"]);
  });

  it("processDocument.json module is valid", () => {
    const mod = loadJson(
      join(__dirname, "..", "app", "modules", "processDocument.json"),
    );
    assert.strictEqual(mod.type, "action");
    assert.strictEqual(mod.method, "POST");
    assert.ok(mod.parameters.find((p) => p.name === "file"));
    assert.ok(mod.body.files);
  });

  it("healthCheck.json module is valid", () => {
    const mod = loadJson(
      join(__dirname, "..", "app", "modules", "healthCheck.json"),
    );
    assert.strictEqual(mod.type, "action");
    assert.strictEqual(mod.method, "GET");
    assert.strictEqual(mod.parameters.length, 0);
  });

  it("all modules reference connection headers", () => {
    const processDoc = loadJson(
      join(__dirname, "..", "app", "modules", "processDocument.json"),
    );
    const health = loadJson(
      join(__dirname, "..", "app", "modules", "healthCheck.json"),
    );
    assert.ok(processDoc.headers["X-API-Key"]);
    assert.ok(health.headers["X-API-Key"]);
  });
});
