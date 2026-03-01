const { describe, it, expect, beforeEach } = require("@jest/globals");

jest.mock("docdigitizer", () => ({
  DocDigitizer: jest.fn().mockImplementation(() => ({
    healthCheck: jest.fn(),
  })),
}), { virtual: true });

const { DocDigitizer } = require("docdigitizer");
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
    const mockInstance = {
      healthCheck: jest.fn().mockResolvedValue("I am alive"),
    };
    DocDigitizer.mockImplementation(() => mockInstance);

    const z = {};
    const bundle = {
      authData: {
        apiKey: "test-key",
        baseUrl: "https://apix.docdigitizer.com/sync",
      },
    };

    const result = await authentication.test(z, bundle);
    expect(result.message).toBe("I am alive");
    expect(DocDigitizer).toHaveBeenCalledWith({
      apiKey: "test-key",
      baseUrl: "https://apix.docdigitizer.com/sync",
    });
  });

  it("test function throws on healthCheck failure", async () => {
    const mockInstance = {
      healthCheck: jest.fn().mockRejectedValue(new Error("Unauthorized")),
    };
    DocDigitizer.mockImplementation(() => mockInstance);

    const z = {};
    const bundle = {
      authData: { apiKey: "bad-key" },
    };

    await expect(authentication.test(z, bundle)).rejects.toThrow(
      "Unauthorized",
    );
  });
});
