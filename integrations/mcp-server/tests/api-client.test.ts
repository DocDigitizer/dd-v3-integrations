import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiClient } from "../src/api-client.js";
import { AuthenticationError, ValidationError } from "../src/errors.js";

const TEST_CONFIG = {
  apiKey: "test-key-123",
  baseUrl: "https://api.test.com",
  timeout: 5000,
};

describe("ApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("healthCheck", () => {
    it("returns response text on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 200,
          text: () => Promise.resolve("I am alive"),
        })
      );

      const client = new ApiClient(TEST_CONFIG);
      const result = await client.healthCheck();

      expect(result).toBe("I am alive");
      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("throws on error status", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ status: 503 })
      );

      const client = new ApiClient(TEST_CONFIG);
      await expect(client.healthCheck()).rejects.toThrow();
    });
  });

  describe("processDocument", () => {
    const successBody = {
      stateText: "COMPLETED",
      traceId: "ABC1234",
      pipeline: "MainPipelineWithOCR",
      numberPages: 2,
      output: {
        extractions: [
          {
            docType: "Invoice",
            confidence: 0.95,
            country: "PT",
            pages: [1, 2],
            extraction: { DocumentNumber: "INV-001" },
          },
        ],
      },
    };

    it("processes base64 content successfully", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 200,
          json: () => Promise.resolve(successBody),
        })
      );

      const client = new ApiClient(TEST_CONFIG);
      const result = await client.processDocument({
        fileContent: Buffer.from("%PDF-1.4 test").toString("base64"),
        fileName: "test.pdf",
      });

      expect(result.state).toBe("COMPLETED");
      expect(result.traceId).toBe("ABC1234");
      expect(result.output?.extractions).toHaveLength(1);
      expect(result.output?.extractions[0].documentType).toBe("Invoice");

      const call = vi.mocked(fetch).mock.calls[0];
      expect(call[0]).toBe("https://api.test.com/extract");
      expect(call[1]?.method).toBe("POST");
      expect((call[1]?.headers as Record<string, string>)["X-API-Key"]).toBe(
        "test-key-123"
      );
    });

    it("throws AuthenticationError on 401", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 401,
          json: () =>
            Promise.resolve({
              traceId: "UNA1",
              messages: ["Invalid API key"],
            }),
        })
      );

      const client = new ApiClient(TEST_CONFIG);
      await expect(
        client.processDocument({ fileContent: "dGVzdA==" })
      ).rejects.toThrow(AuthenticationError);
    });

    it("throws ValidationError on 400", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 400,
          json: () =>
            Promise.resolve({
              traceId: "VAL1",
              messages: ["File must be a PDF"],
            }),
        })
      );

      const client = new ApiClient(TEST_CONFIG);
      await expect(
        client.processDocument({ fileContent: "dGVzdA==" })
      ).rejects.toThrow(ValidationError);
    });

    it("throws if neither filePath nor fileContent provided", async () => {
      const client = new ApiClient(TEST_CONFIG);
      await expect(client.processDocument({})).rejects.toThrow(
        "Either filePath or fileContent"
      );
    });
  });
});
