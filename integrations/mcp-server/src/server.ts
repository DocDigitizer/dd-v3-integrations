import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { ApiClient } from "./api-client.js";
import { DocDigitizerError } from "./errors.js";

export function createServer(): McpServer {
  const config = loadConfig();
  const client = new ApiClient(config);

  const server = new McpServer({
    name: "docdigitizer",
    version: "0.2.0",
  });

  server.tool(
    "health_check",
    "Check if the DocDigitizer API is available and responsive",
    {},
    async () => {
      try {
        const text = await client.healthCheck();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ status: "ok", message: text }),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "process_document",
    "Upload and process a PDF document through DocDigitizer. " +
      "Extracts structured data from invoices, receipts, contracts, CVs, IDs, and bank statements. " +
      "Provide either file_path (local path) or file_content (base64-encoded PDF).",
    {
      file_path: z
        .string()
        .optional()
        .describe("Absolute path to a local PDF file"),
      file_content: z
        .string()
        .optional()
        .describe("Base64-encoded PDF content"),
      file_name: z
        .string()
        .optional()
        .describe(
          "Filename hint (defaults to basename of file_path or 'document.pdf')"
        ),
      document_id: z
        .string()
        .uuid()
        .optional()
        .describe("Document UUID for tracking (auto-generated if omitted)"),
      context_id: z
        .string()
        .uuid()
        .optional()
        .describe(
          "Context UUID for grouping related documents (auto-generated if omitted)"
        ),
      pipeline: z
        .string()
        .optional()
        .describe("Processing pipeline (e.g. 'MainPipelineWithOCR')"),
      request_token: z
        .string()
        .optional()
        .describe("Trace token (max 7 chars, auto-generated if omitted)"),
    },
    async (params) => {
      if (!params.file_path && !params.file_content) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "ValidationError",
                message:
                  "Either file_path or file_content (base64) is required",
              }),
            },
          ],
        };
      }

      try {
        const result = await client.processDocument({
          filePath: params.file_path,
          fileContent: params.file_content,
          fileName: params.file_name,
          id: params.document_id,
          contextId: params.context_id,
          pipelineIdentifier: params.pipeline,
          requestToken: params.request_token,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  return server;
}

function errorResult(error: unknown) {
  if (error instanceof DocDigitizerError) {
    return {
      isError: true as const,
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: error.name,
            message: error.message,
            statusCode: error.statusCode,
            traceId: error.traceId,
            messages: error.messages,
          }),
        },
      ],
    };
  }

  const msg = error instanceof Error ? error.message : String(error);
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ error: "Error", message: msg }),
      },
    ],
  };
}
