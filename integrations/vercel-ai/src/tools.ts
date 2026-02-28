import { tool } from "ai";
import { z } from "zod";
import { DocDigitizer } from "docdigitizer";

export interface DocDigitizerToolConfig {
  /** DocDigitizer API key. Falls back to DOCDIGITIZER_API_KEY env var. */
  apiKey?: string;
  /** API base URL override. */
  baseUrl?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Max retries on transient errors. */
  maxRetries?: number;
}

/**
 * Creates a Vercel AI SDK tool that processes a PDF document
 * using the DocDigitizer API and returns extracted structured data.
 *
 * @example
 * ```typescript
 * import { generateText } from 'ai';
 * import { openai } from '@ai-sdk/openai';
 * import { processDocumentTool } from 'docdigitizer-ai';
 *
 * const { text } = await generateText({
 *   model: openai('gpt-4o'),
 *   prompt: 'Process the invoice at /tmp/invoice.pdf',
 *   tools: {
 *     processDocument: processDocumentTool({ apiKey: 'dd_live_...' }),
 *   },
 * });
 * ```
 */
export function processDocumentTool(config: DocDigitizerToolConfig = {}) {
  const client = new DocDigitizer({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    timeout: config.timeout,
    maxRetries: config.maxRetries,
  });

  return tool({
    description:
      "Process a PDF document using DocDigitizer and extract structured data. " +
      "Returns document type, confidence score, country code, and extracted fields " +
      "for each document found in the PDF.",
    parameters: z.object({
      filePath: z
        .string()
        .describe("Absolute path to the PDF file to process"),
      pipeline: z
        .string()
        .optional()
        .describe("Pipeline name for processing (e.g. 'MainPipelineWithOCR')"),
    }),
    execute: async ({ filePath, pipeline }) => {
      const options: Record<string, string> = { filePath };
      if (pipeline) {
        options.pipelineIdentifier = pipeline;
      }

      const response = await client.process(options);

      return {
        state: response.state,
        traceId: response.traceId,
        numPages: response.numPages,
        extractions:
          response.output?.extractions.map((ext) => ({
            documentType: ext.documentType,
            confidence: ext.confidence,
            countryCode: ext.countryCode,
            pages: ext.pages,
            data: ext.extraction,
          })) ?? [],
      };
    },
  });
}

/**
 * Creates a Vercel AI SDK tool that checks if the DocDigitizer API is available.
 *
 * @example
 * ```typescript
 * import { generateText } from 'ai';
 * import { openai } from '@ai-sdk/openai';
 * import { healthCheckTool } from 'docdigitizer-ai';
 *
 * const { text } = await generateText({
 *   model: openai('gpt-4o'),
 *   prompt: 'Check if DocDigitizer is online',
 *   tools: { healthCheck: healthCheckTool({ apiKey: 'dd_live_...' }) },
 * });
 * ```
 */
export function healthCheckTool(config: DocDigitizerToolConfig = {}) {
  const client = new DocDigitizer({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    timeout: config.timeout,
    maxRetries: config.maxRetries,
  });

  return tool({
    description:
      "Check if the DocDigitizer document processing API is available and responding.",
    parameters: z.object({}),
    execute: async () => {
      const result = await client.healthCheck();
      return { status: "ok", message: result };
    },
  });
}
