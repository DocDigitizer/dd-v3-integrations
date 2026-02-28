import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocDigitizerLoader } from "../src/document-loader.js";

// Mock the docdigitizer SDK
vi.mock("docdigitizer", () => {
  return {
    DocDigitizer: vi.fn().mockImplementation(() => ({
      process: vi.fn(),
      healthCheck: vi.fn(),
    })),
  };
});

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  stat: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

import { DocDigitizer } from "docdigitizer";
import { stat, readdir } from "node:fs/promises";

const mockStat = vi.mocked(stat);
const mockReaddir = vi.mocked(readdir);

function makeResponse(extractions?: any[]) {
  if (!extractions) {
    extractions = [
      {
        documentType: "Invoice",
        confidence: 0.95,
        countryCode: "PT",
        pages: [1, 2],
        pageRange: { start: 1, end: 2 },
        extraction: { invoice_number: "INV-001", total: "1000.00" },
        schema: "Invoice_PT.json",
        modelSource: "llm",
      },
    ];
  }
  return {
    state: "COMPLETED",
    traceId: "ABC1234",
    pipeline: "MainPipelineWithFile",
    numPages: 2,
    output: { extractions },
  };
}

describe("DocDigitizerLoader", () => {
  let mockProcess: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = vi.fn().mockResolvedValue(makeResponse());
    vi.mocked(DocDigitizer).mockImplementation(
      () => ({ process: mockProcess, healthCheck: vi.fn() } as any)
    );
  });

  it("loads a single PDF file", async () => {
    mockStat.mockResolvedValue({ isDirectory: () => false } as any);

    const loader = new DocDigitizerLoader("invoice.pdf", { apiKey: "test" });
    const docs = await loader.load();

    expect(docs).toHaveLength(1);
    expect(mockProcess).toHaveBeenCalledOnce();
  });

  it("returns JSON pageContent by default", async () => {
    mockStat.mockResolvedValue({ isDirectory: () => false } as any);

    const loader = new DocDigitizerLoader("invoice.pdf", { apiKey: "test" });
    const docs = await loader.load();

    const content = JSON.parse(docs[0].pageContent);
    expect(content.invoice_number).toBe("INV-001");
    expect(content.total).toBe("1000.00");
  });

  it("returns text pageContent when configured", async () => {
    mockStat.mockResolvedValue({ isDirectory: () => false } as any);

    const loader = new DocDigitizerLoader("invoice.pdf", {
      apiKey: "test",
      contentFormat: "text",
    });
    const docs = await loader.load();

    expect(docs[0].pageContent).toContain("invoice_number: INV-001");
    expect(docs[0].pageContent).toContain("total: 1000.00");
  });

  it("returns kv pageContent when configured", async () => {
    mockStat.mockResolvedValue({ isDirectory: () => false } as any);

    const loader = new DocDigitizerLoader("invoice.pdf", {
      apiKey: "test",
      contentFormat: "kv",
    });
    const docs = await loader.load();

    expect(docs[0].pageContent).toContain("invoice_number=INV-001");
  });

  it("includes correct metadata", async () => {
    mockStat.mockResolvedValue({ isDirectory: () => false } as any);

    const loader = new DocDigitizerLoader("invoice.pdf", { apiKey: "test" });
    const docs = await loader.load();

    const meta = docs[0].metadata;
    expect(meta.documentType).toBe("Invoice");
    expect(meta.confidence).toBe(0.95);
    expect(meta.countryCode).toBe("PT");
    expect(meta.pages).toEqual([1, 2]);
    expect(meta.pageRange).toEqual({ start: 1, end: 2 });
    expect(meta.traceId).toBe("ABC1234");
    expect(meta.source).toBe("invoice.pdf");
    expect(meta.schema).toBe("Invoice_PT.json");
    expect(meta.modelSource).toBe("llm");
    expect(meta.pipeline).toBe("MainPipelineWithFile");
    expect(meta.numPages).toBe(2);
  });

  it("handles multiple extractions", async () => {
    mockProcess.mockResolvedValue(
      makeResponse([
        {
          documentType: "Invoice",
          confidence: 0.95,
          countryCode: "PT",
          pages: [1],
          extraction: { invoice_number: "INV-001" },
        },
        {
          documentType: "Receipt",
          confidence: 0.88,
          countryCode: "PT",
          pages: [2],
          extraction: { receipt_number: "REC-001" },
        },
      ])
    );
    mockStat.mockResolvedValue({ isDirectory: () => false } as any);

    const loader = new DocDigitizerLoader("multi.pdf", { apiKey: "test" });
    const docs = await loader.load();

    expect(docs).toHaveLength(2);
    expect(docs[0].metadata.documentType).toBe("Invoice");
    expect(docs[1].metadata.documentType).toBe("Receipt");
  });

  it("loads directory of PDFs", async () => {
    mockStat.mockResolvedValue({ isDirectory: () => true } as any);
    mockReaddir.mockResolvedValue(["a.pdf", "b.pdf", "readme.txt"] as any);

    const loader = new DocDigitizerLoader("invoices/", { apiKey: "test" });
    const docs = await loader.load();

    expect(docs).toHaveLength(2);
    expect(mockProcess).toHaveBeenCalledTimes(2);
  });

  it("returns empty array for no extractions", async () => {
    mockProcess.mockResolvedValue(makeResponse([]));
    mockStat.mockResolvedValue({ isDirectory: () => false } as any);

    const loader = new DocDigitizerLoader("empty.pdf", { apiKey: "test" });
    const docs = await loader.load();

    expect(docs).toHaveLength(0);
  });

  it("passes pipeline to SDK", async () => {
    mockStat.mockResolvedValue({ isDirectory: () => false } as any);

    const loader = new DocDigitizerLoader("invoice.pdf", {
      apiKey: "test",
      pipeline: "CustomPipeline",
    });
    await loader.load();

    expect(mockProcess).toHaveBeenCalledWith(
      expect.objectContaining({ pipelineIdentifier: "CustomPipeline" })
    );
  });

  it("constructs DocDigitizer client with config", () => {
    const loader = new DocDigitizerLoader("invoice.pdf", {
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
