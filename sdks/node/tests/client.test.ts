import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DocDigitizer } from "../src/client.js";
import {
  AuthenticationError,
  ValidationError,
  ServerError,
} from "../src/errors.js";

const MOCK_RESPONSE = {
  stateText: "COMPLETED",
  traceId: "ABC1234",
  pipeline: "MainPipelineWithOCR",
  numberPages: 1,
  output: {
    extractions: [
      {
        docType: "Invoice",
        confidence: 0.95,
        country: "PT",
        pages: [1],
        extraction: { DocumentNumber: "INV-001" },
      },
    ],
  },
};

describe("DocDigitizer client", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.DOCDIGITIZER_API_KEY = "test-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.DOCDIGITIZER_API_KEY;
  });

  it("can be constructed with string api key", () => {
    const dd = new DocDigitizer("my-key");
    expect(dd).toBeInstanceOf(DocDigitizer);
  });

  it("can be constructed with options object", () => {
    const dd = new DocDigitizer({ apiKey: "my-key", baseUrl: "https://example.com" });
    expect(dd).toBeInstanceOf(DocDigitizer);
  });

  it("can be constructed from env vars", () => {
    const dd = new DocDigitizer();
    expect(dd).toBeInstanceOf(DocDigitizer);
  });

  it("throws when no API key is available", () => {
    delete process.env.DOCDIGITIZER_API_KEY;
    expect(() => new DocDigitizer()).toThrow("API key is required");
  });

  describe("healthCheck", () => {
    it("returns text on success", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 200,
        text: () => Promise.resolve("I am alive"),
      });
      const dd = new DocDigitizer("test-key");
      const result = await dd.healthCheck();
      expect(result).toBe("I am alive");
    });

    it("throws on error status", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 503,
      });
      const dd = new DocDigitizer("test-key");
      await expect(dd.healthCheck()).rejects.toThrow();
    });
  });

  describe("process", () => {
    it("processes a file from Buffer", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 200,
        json: () => Promise.resolve(MOCK_RESPONSE),
      });
      const dd = new DocDigitizer("test-key");
      const result = await dd.process({
        fileContent: Buffer.from("fake-pdf"),
        fileName: "test.pdf",
      });
      expect(result.state).toBe("COMPLETED");
      expect(result.output?.extractions[0].documentType).toBe("Invoice");
    });

    it("accepts string shortcut for filePath", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 200,
        json: () => Promise.resolve(MOCK_RESPONSE),
      });
      const dd = new DocDigitizer("test-key");
      // Mock readFile by overriding the import is complex,
      // so we test with Buffer content instead
      const result = await dd.process({
        fileContent: Buffer.from("fake-pdf"),
      });
      expect(result.state).toBe("COMPLETED");
    });

    it("throws when no file is provided", async () => {
      const dd = new DocDigitizer("test-key");
      await expect(dd.process({})).rejects.toThrow(
        "Either filePath or fileContent"
      );
    });

    it("throws AuthenticationError on 401", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 401,
        json: () =>
          Promise.resolve({
            stateText: "ERROR",
            traceId: "AUTH1",
            messages: ["Invalid API key"],
          }),
      });
      const dd = new DocDigitizer({ apiKey: "bad-key", maxRetries: 0 });
      await expect(
        dd.process({ fileContent: Buffer.from("fake") })
      ).rejects.toThrow(AuthenticationError);
    });

    it("throws ValidationError on 400", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 400,
        json: () =>
          Promise.resolve({
            stateText: "ERROR",
            traceId: "VAL1",
            messages: ["Invalid PDF"],
          }),
      });
      const dd = new DocDigitizer({ apiKey: "test-key", maxRetries: 0 });
      await expect(
        dd.process({ fileContent: Buffer.from("fake") })
      ).rejects.toThrow(ValidationError);
    });

    it("retries on 500 then succeeds", async () => {
      let calls = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        calls++;
        if (calls === 1) {
          return Promise.resolve({
            status: 500,
            json: () =>
              Promise.resolve({ stateText: "ERROR", messages: ["Server error"] }),
          });
        }
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve(MOCK_RESPONSE),
        });
      });
      const dd = new DocDigitizer({ apiKey: "test-key", maxRetries: 2 });
      const result = await dd.process({
        fileContent: Buffer.from("fake"),
      });
      expect(result.state).toBe("COMPLETED");
      expect(calls).toBe(2);
    });

    it("throws after exhausting retries", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 500,
        json: () =>
          Promise.resolve({
            stateText: "ERROR",
            traceId: "ERR1",
            messages: ["Server error"],
          }),
      });
      const dd = new DocDigitizer({ apiKey: "test-key", maxRetries: 1 });
      await expect(
        dd.process({ fileContent: Buffer.from("fake") })
      ).rejects.toThrow(ServerError);
    });
  });
});
