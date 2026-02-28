import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock config before importing server
vi.mock("../src/config.js", () => ({
  loadConfig: () => ({
    apiKey: "test-key",
    baseUrl: "https://api.test.com",
    timeout: 5000,
  }),
}));

// Mock ApiClient
const mockHealthCheck = vi.fn();
const mockProcessDocument = vi.fn();

vi.mock("../src/api-client.js", () => ({
  ApiClient: vi.fn().mockImplementation(() => ({
    healthCheck: mockHealthCheck,
    processDocument: mockProcessDocument,
  })),
}));

import { createServer } from "../src/server.js";
import { DocDigitizerError } from "../src/errors.js";

function getToolHandler(server: ReturnType<typeof createServer>, name: string) {
  const tools = (server as any)._registeredTools;
  const tool = tools[name];
  if (!tool) throw new Error(`Tool '${name}' not found`);
  return tool.handler as (params: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
}

function getToolNames(server: ReturnType<typeof createServer>): string[] {
  return Object.keys((server as any)._registeredTools);
}

describe("MCP Server Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("health_check tool", () => {
    it("is registered", () => {
      const server = createServer();
      expect(getToolNames(server)).toContain("health_check");
    });

    it("returns success result", async () => {
      mockHealthCheck.mockResolvedValue("I am alive");

      const server = createServer();
      const handler = getToolHandler(server, "health_check");
      const result = await handler({});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.status).toBe("ok");
      expect(parsed.message).toBe("I am alive");
    });

    it("returns error result on failure", async () => {
      mockHealthCheck.mockRejectedValue(
        new DocDigitizerError("Service unavailable", 503)
      );

      const server = createServer();
      const handler = getToolHandler(server, "health_check");
      const result = await handler({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe("DocDigitizerError");
      expect(parsed.statusCode).toBe(503);
    });
  });

  describe("process_document tool", () => {
    it("is registered", () => {
      const server = createServer();
      expect(getToolNames(server)).toContain("process_document");
    });

    const mockResponse = {
      state: "COMPLETED",
      traceId: "ABC1234",
      pipeline: "MainPipelineWithOCR",
      numPages: 2,
      output: {
        extractions: [
          {
            documentType: "Invoice",
            confidence: 0.95,
            countryCode: "PT",
            pages: [1, 2],
            pageRange: { start: 1, end: 2 },
            extraction: { DocumentNumber: "INV-001" },
          },
        ],
      },
    };

    it("processes with file_content", async () => {
      mockProcessDocument.mockResolvedValue(mockResponse);

      const server = createServer();
      const handler = getToolHandler(server, "process_document");
      const result = await handler({
        file_content: "JVBERi0xLjQ=",
        file_name: "test.pdf",
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.state).toBe("COMPLETED");
      expect(parsed.output.extractions[0].documentType).toBe("Invoice");
    });

    it("returns validation error when no file provided", async () => {
      const server = createServer();
      const handler = getToolHandler(server, "process_document");
      const result = await handler({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe("ValidationError");
    });

    it("returns error on API failure", async () => {
      mockProcessDocument.mockRejectedValue(
        new DocDigitizerError("Invalid API key", 401, "UNA1")
      );

      const server = createServer();
      const handler = getToolHandler(server, "process_document");
      const result = await handler({
        file_content: "JVBERi0xLjQ=",
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe("DocDigitizerError");
      expect(parsed.statusCode).toBe(401);
    });
  });
});
