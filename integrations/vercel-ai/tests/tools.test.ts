import { describe, it, expect, vi, beforeEach } from "vitest";
import { processDocumentTool, healthCheckTool } from "../src/tools.js";

// Mock the docdigitizer SDK
vi.mock("docdigitizer", () => {
  return {
    DocDigitizer: vi.fn().mockImplementation(() => ({
      process: vi.fn(),
      healthCheck: vi.fn(),
    })),
  };
});

// Mock the ai module's tool function to return a testable object
vi.mock("ai", () => ({
  tool: vi.fn((config) => ({
    description: config.description,
    parameters: config.parameters,
    execute: config.execute,
  })),
}));

import { DocDigitizer } from "docdigitizer";

function makeResponse(extractions?: any[]) {
  if (!extractions) {
    extractions = [
      {
        documentType: "Invoice",
        confidence: 0.95,
        countryCode: "PT",
        pages: [1, 2],
        extraction: { invoice_number: "INV-001", total: "1000.00" },
      },
    ];
  }
  return {
    state: "COMPLETED",
    traceId: "ABC1234",
    numPages: 2,
    output: { extractions },
  };
}

describe("processDocumentTool", () => {
  let mockProcess: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = vi.fn().mockResolvedValue(makeResponse());
    vi.mocked(DocDigitizer).mockImplementation(
      () => ({ process: mockProcess, healthCheck: vi.fn() } as any)
    );
  });

  it("creates a tool with description", () => {
    const t = processDocumentTool({ apiKey: "test" });
    expect(t.description).toContain("Process a PDF document");
  });

  it("has parameters schema with filePath", () => {
    const t = processDocumentTool({ apiKey: "test" });
    // Zod schema should parse valid input
    const result = t.parameters.safeParse({ filePath: "/tmp/invoice.pdf" });
    expect(result.success).toBe(true);
  });

  it("rejects missing filePath", () => {
    const t = processDocumentTool({ apiKey: "test" });
    const result = t.parameters.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts optional pipeline parameter", () => {
    const t = processDocumentTool({ apiKey: "test" });
    const result = t.parameters.safeParse({
      filePath: "/tmp/invoice.pdf",
      pipeline: "CustomPipeline",
    });
    expect(result.success).toBe(true);
  });

  it("executes and returns extraction data", async () => {
    const t = processDocumentTool({ apiKey: "test" });
    const result = await t.execute({ filePath: "/tmp/invoice.pdf" });

    expect(result.state).toBe("COMPLETED");
    expect(result.traceId).toBe("ABC1234");
    expect(result.numPages).toBe(2);
    expect(result.extractions).toHaveLength(1);
    expect(result.extractions[0].documentType).toBe("Invoice");
    expect(result.extractions[0].confidence).toBe(0.95);
    expect(result.extractions[0].data.invoice_number).toBe("INV-001");
  });

  it("passes pipeline to SDK", async () => {
    const t = processDocumentTool({ apiKey: "test" });
    await t.execute({
      filePath: "/tmp/invoice.pdf",
      pipeline: "CustomPipeline",
    });

    expect(mockProcess).toHaveBeenCalledWith(
      expect.objectContaining({ pipelineIdentifier: "CustomPipeline" })
    );
  });

  it("handles empty extractions", async () => {
    mockProcess.mockResolvedValue(makeResponse([]));

    const t = processDocumentTool({ apiKey: "test" });
    const result = await t.execute({ filePath: "/tmp/empty.pdf" });

    expect(result.extractions).toHaveLength(0);
  });

  it("passes config to DocDigitizer client", () => {
    processDocumentTool({
      apiKey: "my-key",
      baseUrl: "https://custom.api.com",
      timeout: 60000,
      maxRetries: 5,
    });

    expect(DocDigitizer).toHaveBeenCalledWith({
      apiKey: "my-key",
      baseUrl: "https://custom.api.com",
      timeout: 60000,
      maxRetries: 5,
    });
  });
});

describe("healthCheckTool", () => {
  let mockHealthCheck: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHealthCheck = vi.fn().mockResolvedValue("I am alive");
    vi.mocked(DocDigitizer).mockImplementation(
      () => ({ process: vi.fn(), healthCheck: mockHealthCheck } as any)
    );
  });

  it("creates a tool with description", () => {
    const t = healthCheckTool({ apiKey: "test" });
    expect(t.description).toContain("DocDigitizer");
  });

  it("has empty parameters schema", () => {
    const t = healthCheckTool({ apiKey: "test" });
    const result = t.parameters.safeParse({});
    expect(result.success).toBe(true);
  });

  it("executes and returns status", async () => {
    const t = healthCheckTool({ apiKey: "test" });
    const result = await t.execute({});

    expect(result.status).toBe("ok");
    expect(result.message).toBe("I am alive");
    expect(mockHealthCheck).toHaveBeenCalledOnce();
  });
});
