import { describe, it, expect } from "vitest";
import { parseResponse } from "../src/models.js";

const CAMEL_CASE_RESPONSE = {
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
        extraction: {
          DocumentNumber: "INV-2024-001",
          TotalAmount: 1250.0,
        },
        schema: "Invoice_PT.json",
        modelSource: "llm",
      },
    ],
  },
  timers: { DocIngester: { total: 2345.67 } },
  messages: ["Document processed successfully"],
};

const PASCAL_CASE_RESPONSE = {
  StateText: "COMPLETED",
  TraceId: "ABC1234",
  Pipeline: "MainPipelineWithOCR",
  NumberPages: 2,
  Output: {
    extractions: [
      {
        documentType: "Invoice",
        confidence: 0.95,
        countryCode: "PT",
        pageRange: { start: 1, end: 2 },
        extraction: {
          DocumentNumber: "INV-2024-001",
          TotalAmount: 1250.0,
        },
      },
    ],
  },
  Timers: { DocIngester: { total: 2345.67 } },
  Messages: ["Document processed successfully"],
};

describe("parseResponse — camelCase (actual API)", () => {
  it("parses top-level fields", () => {
    const result = parseResponse(CAMEL_CASE_RESPONSE);
    expect(result.state).toBe("COMPLETED");
    expect(result.traceId).toBe("ABC1234");
    expect(result.pipeline).toBe("MainPipelineWithOCR");
    expect(result.numPages).toBe(2);
    expect(result.timers).toBeDefined();
    expect(result.messages).toEqual(["Document processed successfully"]);
  });

  it("parses extractions", () => {
    const result = parseResponse(CAMEL_CASE_RESPONSE);
    expect(result.output?.extractions).toHaveLength(1);
    const ext = result.output!.extractions[0];
    expect(ext.documentType).toBe("Invoice");
    expect(ext.confidence).toBe(0.95);
    expect(ext.countryCode).toBe("PT");
    expect(ext.extraction["DocumentNumber"]).toBe("INV-2024-001");
    expect(ext.schema).toBe("Invoice_PT.json");
    expect(ext.modelSource).toBe("llm");
  });

  it("derives pageRange from pages array", () => {
    const result = parseResponse(CAMEL_CASE_RESPONSE);
    const ext = result.output!.extractions[0];
    expect(ext.pages).toEqual([1, 2]);
    expect(ext.pageRange).toEqual({ start: 1, end: 2 });
  });
});

describe("parseResponse — PascalCase (OpenAPI spec)", () => {
  it("parses top-level fields", () => {
    const result = parseResponse(PASCAL_CASE_RESPONSE);
    expect(result.state).toBe("COMPLETED");
    expect(result.traceId).toBe("ABC1234");
    expect(result.pipeline).toBe("MainPipelineWithOCR");
    expect(result.numPages).toBe(2);
  });

  it("parses pageRange from object", () => {
    const result = parseResponse(PASCAL_CASE_RESPONSE);
    const ext = result.output!.extractions[0];
    expect(ext.pageRange).toEqual({ start: 1, end: 2 });
  });
});

describe("parseResponse — edge cases", () => {
  it("handles empty response", () => {
    const result = parseResponse({ stateText: "COMPLETED", traceId: "X" });
    expect(result.state).toBe("COMPLETED");
    expect(result.output).toBeUndefined();
  });

  it("handles null fields", () => {
    const result = parseResponse({
      stateText: "COMPLETED",
      traceId: "X",
      pipeline: null,
      numberPages: null,
      output: null,
      timers: null,
      messages: null,
    });
    expect(result.pipeline).toBeNull();
    expect(result.numPages).toBeNull();
    expect(result.output).toBeUndefined();
    expect(result.timers).toBeNull();
    expect(result.messages).toBeNull();
  });

  it("handles multiple extractions", () => {
    const data = {
      stateText: "COMPLETED",
      traceId: "MULTI1",
      output: {
        extractions: [
          {
            docType: "Invoice",
            confidence: 0.9,
            country: "PT",
            pages: [1, 2],
            extraction: { DocumentNumber: "INV-001" },
          },
          {
            docType: "Receipt",
            confidence: 0.85,
            country: "ES",
            pages: [3],
            extraction: { DocumentNumber: "REC-001" },
          },
        ],
      },
    };
    const result = parseResponse(data);
    expect(result.output?.extractions).toHaveLength(2);
    expect(result.output!.extractions[0].documentType).toBe("Invoice");
    expect(result.output!.extractions[1].documentType).toBe("Receipt");
    expect(result.output!.extractions[1].pageRange).toEqual({
      start: 3,
      end: 3,
    });
  });

  it("handles error response", () => {
    const data = {
      stateText: "ERROR",
      traceId: "ERR9876",
      messages: ["File must be a PDF document"],
    };
    const result = parseResponse(data);
    expect(result.state).toBe("ERROR");
    expect(result.traceId).toBe("ERR9876");
    expect(result.messages).toEqual(["File must be a PDF document"]);
  });
});
