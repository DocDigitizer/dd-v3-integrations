import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock docdigitizer SDK
const mockProcess = vi.fn();
const mockHealthCheck = vi.fn();

vi.mock("docdigitizer", () => ({
  DocDigitizer: vi.fn().mockImplementation(() => ({
    process: mockProcess,
    healthCheck: mockHealthCheck,
  })),
}));

// We test the node logic by importing and calling execute with mocked context
import { DocDigitizerNode } from "../nodes/DocDigitizer/DocDigitizer.node.js";

function createMockExecuteFunctions(overrides: Record<string, unknown> = {}) {
  const items = (overrides.items ?? [{ json: {} }]) as Array<{ json: Record<string, unknown>; binary?: Record<string, unknown> }>;
  const params = (overrides.params ?? {}) as Record<string, unknown>;
  const credentials = (overrides.credentials ?? {
    apiKey: "test-key",
    baseUrl: "https://api.docdigitizer.com/v3/docingester",
  }) as Record<string, unknown>;

  return {
    getInputData: vi.fn().mockReturnValue(items),
    getNodeParameter: vi.fn((name: string, _index: number, fallback?: unknown) => {
      return params[name] ?? fallback;
    }),
    getCredentials: vi.fn().mockResolvedValue(credentials),
    getNode: vi.fn().mockReturnValue({ name: "DocDigitizer" }),
    continueOnFail: vi.fn().mockReturnValue(false),
    helpers: {
      assertBinaryData: vi.fn().mockReturnValue({
        fileName: "invoice.pdf",
        mimeType: "application/pdf",
      }),
      getBinaryDataBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-pdf")),
    },
  };
}

describe("DocDigitizer Node", () => {
  const node = new DocDigitizerNode();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("description", () => {
    it("has correct metadata", () => {
      expect(node.description.displayName).toBe("DocDigitizer");
      expect(node.description.name).toBe("docDigitizer");
      expect(node.description.version).toBe(1);
    });

    it("requires docDigitizerApi credentials", () => {
      expect(node.description.credentials).toEqual([
        { name: "docDigitizerApi", required: true },
      ]);
    });

    it("has document and health resources", () => {
      const resourceProp = node.description.properties.find(
        (p) => p.name === "resource",
      );
      expect(resourceProp).toBeDefined();
      const options = (resourceProp as any).options;
      const values = options.map((o: any) => o.value);
      expect(values).toContain("document");
      expect(values).toContain("health");
    });
  });

  describe("document → process", () => {
    it("processes a document from binary input", async () => {
      mockProcess.mockResolvedValue({
        state: "COMPLETED",
        traceId: "trace-123",
        pipeline: "MainPipeline",
        numPages: 2,
        output: {
          extractions: [
            {
              documentType: "Invoice",
              confidence: 0.95,
              countryCode: "PT",
              pages: [1, 2],
              pageRange: { start: 1, end: 2 },
              extraction: { invoiceNumber: "INV-001" },
              schema: "invoice-v1",
            },
          ],
        },
      });

      const ctx = createMockExecuteFunctions({
        params: {
          resource: "document",
          operation: "process",
          binaryPropertyName: "data",
          pipeline: "",
        },
        items: [{ json: {}, binary: { data: {} } }],
      });

      const result = await node.execute.call(ctx as any);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual({
        state: "COMPLETED",
        traceId: "trace-123",
        pipeline: "MainPipeline",
        numPages: 2,
        extractions: [
          {
            documentType: "Invoice",
            confidence: 0.95,
            countryCode: "PT",
            pages: [1, 2],
            pageRange: { start: 1, end: 2 },
            extraction: { invoiceNumber: "INV-001" },
            schema: "invoice-v1",
          },
        ],
      });

      expect(mockProcess).toHaveBeenCalledWith({
        fileContent: expect.any(Buffer),
        fileName: "invoice.pdf",
        pipelineIdentifier: undefined,
      });
    });

    it("passes pipeline parameter when provided", async () => {
      mockProcess.mockResolvedValue({
        state: "COMPLETED",
        traceId: "trace-456",
        output: { extractions: [] },
      });

      const ctx = createMockExecuteFunctions({
        params: {
          resource: "document",
          operation: "process",
          binaryPropertyName: "data",
          pipeline: "CustomPipeline",
        },
      });

      await node.execute.call(ctx as any);

      expect(mockProcess).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineIdentifier: "CustomPipeline",
        }),
      );
    });

    it("handles empty extractions", async () => {
      mockProcess.mockResolvedValue({
        state: "COMPLETED",
        traceId: "trace-789",
        output: { extractions: [] },
      });

      const ctx = createMockExecuteFunctions({
        params: {
          resource: "document",
          operation: "process",
          binaryPropertyName: "data",
          pipeline: "",
        },
      });

      const result = await node.execute.call(ctx as any);
      expect(result[0][0].json.extractions).toEqual([]);
    });

    it("handles response without output", async () => {
      mockProcess.mockResolvedValue({
        state: "PROCESSING",
        traceId: "trace-000",
      });

      const ctx = createMockExecuteFunctions({
        params: {
          resource: "document",
          operation: "process",
          binaryPropertyName: "data",
          pipeline: "",
        },
      });

      const result = await node.execute.call(ctx as any);
      expect(result[0][0].json.extractions).toEqual([]);
    });

    it("processes multiple items", async () => {
      mockProcess
        .mockResolvedValueOnce({
          state: "COMPLETED",
          traceId: "trace-a",
          output: {
            extractions: [
              {
                documentType: "Invoice",
                confidence: 0.9,
                countryCode: "PT",
                pages: [1],
                extraction: {},
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          state: "COMPLETED",
          traceId: "trace-b",
          output: {
            extractions: [
              {
                documentType: "Receipt",
                confidence: 0.85,
                countryCode: "US",
                pages: [1],
                extraction: {},
              },
            ],
          },
        });

      const ctx = createMockExecuteFunctions({
        params: {
          resource: "document",
          operation: "process",
          binaryPropertyName: "data",
          pipeline: "",
        },
        items: [{ json: {} }, { json: {} }],
      });

      const result = await node.execute.call(ctx as any);
      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json.traceId).toBe("trace-a");
      expect(result[0][1].json.traceId).toBe("trace-b");
    });

    it("throws NodeOperationError on SDK error", async () => {
      mockProcess.mockRejectedValue(new Error("API Error"));

      const ctx = createMockExecuteFunctions({
        params: {
          resource: "document",
          operation: "process",
          binaryPropertyName: "data",
          pipeline: "",
        },
      });

      await expect(node.execute.call(ctx as any)).rejects.toThrow();
    });

    it("continues on fail when configured", async () => {
      mockProcess.mockRejectedValue(new Error("API Error"));

      const ctx = createMockExecuteFunctions({
        params: {
          resource: "document",
          operation: "process",
          binaryPropertyName: "data",
          pipeline: "",
        },
      });
      ctx.continueOnFail.mockReturnValue(true);

      const result = await node.execute.call(ctx as any);
      expect(result[0][0].json.error).toBe("API Error");
    });
  });

  describe("health → check", () => {
    it("returns health status", async () => {
      mockHealthCheck.mockResolvedValue("I am alive");

      const ctx = createMockExecuteFunctions({
        params: {
          resource: "health",
          operation: "check",
        },
      });

      const result = await node.execute.call(ctx as any);

      expect(result[0][0].json).toEqual({
        status: "alive",
        message: "I am alive",
      });
    });
  });
});
