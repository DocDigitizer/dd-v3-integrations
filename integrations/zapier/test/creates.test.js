const { describe, it, expect, beforeEach } = require("@jest/globals");

// Mock docdigitizer SDK (virtual: true because it's an ESM package)
jest.mock("docdigitizer", () => ({
  DocDigitizer: jest.fn().mockImplementation(() => ({
    process: jest.fn(),
    healthCheck: jest.fn(),
  })),
}), { virtual: true });

const { DocDigitizer } = require("docdigitizer");
const processDocument = require("../creates/process_document");

const createBundle = (overrides = {}) => ({
  authData: {
    apiKey: "test-key",
    baseUrl: "https://apix.docdigitizer.com/sync",
  },
  inputData: {
    file: "https://example.com/invoice.pdf",
    fileName: "",
    pipeline: "",
    ...overrides,
  },
});

const createZ = () => ({
  request: jest.fn().mockResolvedValue({
    buffer: () => Promise.resolve(Buffer.from("fake-pdf")),
  }),
});

describe("Process Document Action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("has correct key and display", () => {
    expect(processDocument.key).toBe("process_document");
    expect(processDocument.noun).toBe("Document");
    expect(processDocument.display.label).toBe("Process Document");
  });

  it("has required input fields", () => {
    const fields = processDocument.operation.inputFields;
    const fileField = fields.find((f) => f.key === "file");
    expect(fileField).toBeDefined();
    expect(fileField.type).toBe("file");
    expect(fileField.required).toBe(true);
  });

  it("processes a document successfully", async () => {
    const mockInstance = {
      process: jest.fn().mockResolvedValue({
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
              extraction: { invoiceNumber: "INV-001" },
            },
          ],
        },
      }),
    };
    DocDigitizer.mockImplementation(() => mockInstance);

    const z = createZ();
    const bundle = createBundle();

    const result = await processDocument.operation.perform(z, bundle);

    expect(result.state).toBe("COMPLETED");
    expect(result.traceId).toBe("trace-123");
    expect(result.extractions).toHaveLength(1);
    expect(result.extractions[0].documentType).toBe("Invoice");
    expect(result.extractions[0].confidence).toBe(0.95);
  });

  it("downloads file from URL", async () => {
    const mockInstance = {
      process: jest.fn().mockResolvedValue({
        state: "COMPLETED",
        traceId: "trace-456",
        output: { extractions: [] },
      }),
    };
    DocDigitizer.mockImplementation(() => mockInstance);

    const z = createZ();
    const bundle = createBundle({
      file: "https://example.com/path/to/invoice.pdf",
    });

    await processDocument.operation.perform(z, bundle);

    expect(z.request).toHaveBeenCalledWith({
      url: "https://example.com/path/to/invoice.pdf",
      raw: true,
    });
    expect(mockInstance.process).toHaveBeenCalledWith(
      expect.objectContaining({
        fileContent: expect.any(Buffer),
        fileName: "invoice.pdf",
      }),
    );
  });

  it("passes pipeline parameter", async () => {
    const mockInstance = {
      process: jest.fn().mockResolvedValue({
        state: "COMPLETED",
        traceId: "trace-789",
        output: { extractions: [] },
      }),
    };
    DocDigitizer.mockImplementation(() => mockInstance);

    const z = createZ();
    const bundle = createBundle({ pipeline: "CustomPipeline" });

    await processDocument.operation.perform(z, bundle);

    expect(mockInstance.process).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineIdentifier: "CustomPipeline",
      }),
    );
  });

  it("handles empty extractions", async () => {
    const mockInstance = {
      process: jest.fn().mockResolvedValue({
        state: "COMPLETED",
        traceId: "trace-000",
        output: { extractions: [] },
      }),
    };
    DocDigitizer.mockImplementation(() => mockInstance);

    const z = createZ();
    const bundle = createBundle();

    const result = await processDocument.operation.perform(z, bundle);
    expect(result.extractions).toEqual([]);
  });

  it("has sample output", () => {
    expect(processDocument.operation.sample).toBeDefined();
    expect(processDocument.operation.sample.state).toBe("COMPLETED");
    expect(processDocument.operation.sample.extractions).toHaveLength(1);
  });
});
