const { describe, it, expect, beforeEach } = require("@jest/globals");

const mockHealthCheck = jest.fn();
jest.mock("../lib/sdk", () => ({
  getClient: jest.fn().mockImplementation(() =>
    Promise.resolve({ healthCheck: mockHealthCheck }),
  ),
}));

const { getClient } = require("../lib/sdk");
const authentication = require("../authentication");

describe("Authentication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("has custom type", () => {
    expect(authentication.type).toBe("custom");
  });

  it("has apiKey and baseUrl fields", () => {
    const fields = authentication.fields;
    expect(fields.find((f) => f.key === "apiKey")).toBeDefined();
    expect(fields.find((f) => f.key === "baseUrl")).toBeDefined();
  });

  it("apiKey is required", () => {
    const apiKeyField = authentication.fields.find((f) => f.key === "apiKey");
    expect(apiKeyField.required).toBe(true);
  });

  it("test function calls healthCheck", async () => {
    mockHealthCheck.mockResolvedValue("I am alive");

    const z = {};
    const bundle = {
      authData: {
        apiKey: "test-key",
        baseUrl: "https://apix.docdigitizer.com/sync",
      },
    };

    const result = await authentication.test(z, bundle);
    expect(result.message).toBe("I am alive");
    expect(getClient).toHaveBeenCalledWith({
      apiKey: "test-key",
      baseUrl: "https://apix.docdigitizer.com/sync",
    });
  });

  it("test function throws on healthCheck failure", async () => {
    mockHealthCheck.mockRejectedValue(new Error("Unauthorized"));

    const z = {};
    const bundle = {
      authData: { apiKey: "bad-key" },
    };

    await expect(authentication.test(z, bundle)).rejects.toThrow(
      "Unauthorized",
    );
  });
});
