import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { randomUUID } from "node:crypto";
import type { ClientConfig } from "./config.js";
import { resolveConfig } from "./config.js";
import type { ProcessingResponse } from "./models.js";
import { parseResponse } from "./models.js";
import { raiseForStatus, RETRYABLE_STATUS_CODES } from "./errors.js";

export interface ProcessOptions {
  /** Path to a PDF file on disk. */
  filePath?: string;
  /** PDF file as a Buffer. */
  fileContent?: Buffer;
  /** Override the file name sent to the API. */
  fileName?: string;
  /** Document UUID (auto-generated if omitted). */
  id?: string;
  /** Context UUID for grouping documents (auto-generated if omitted). */
  contextId?: string;
  /** Pipeline name to use for processing. */
  pipelineIdentifier?: string;
  /** Trace token for distributed tracing. */
  requestToken?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class DocDigitizer {
  private readonly config: ClientConfig;

  constructor(options?: Partial<ClientConfig> | string) {
    if (typeof options === "string") {
      this.config = resolveConfig({ apiKey: options });
    } else {
      this.config = resolveConfig(options);
    }
  }

  /** Check if the API is healthy and responsive. */
  async healthCheck(): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/`, {
      method: "GET",
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (response.status >= 400) {
      raiseForStatus(response.status);
    }

    return response.text();
  }

  /** Process a PDF document and extract structured data. */
  async process(options: ProcessOptions | string): Promise<ProcessingResponse> {
    const opts: ProcessOptions =
      typeof options === "string" ? { filePath: options } : options;

    let fileBuffer: Buffer;
    let fileName: string;

    if (opts.filePath) {
      fileBuffer = await readFile(opts.filePath);
      fileName = opts.fileName ?? basename(opts.filePath);
    } else if (opts.fileContent) {
      fileBuffer = opts.fileContent;
      fileName = opts.fileName ?? "document.pdf";
    } else {
      throw new Error(
        "Either filePath or fileContent (Buffer) is required."
      );
    }

    const form = new FormData();
    const blob = new Blob(
      [
        fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength
        ),
      ] as BlobPart[],
      { type: "application/pdf" }
    );
    form.append("files", blob, fileName);
    form.append("id", opts.id ?? randomUUID());
    form.append("contextID", opts.contextId ?? randomUUID());

    if (opts.pipelineIdentifier) {
      form.append("pipelineIdentifier", opts.pipelineIdentifier);
    }
    if (opts.requestToken) {
      form.append("requestToken", opts.requestToken);
    }

    return this.executeWithRetry(form);
  }

  private async executeWithRetry(form: FormData): Promise<ProcessingResponse> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(1000 * 2 ** (attempt - 1), 30_000);
        await sleep(delay);
      }

      const response = await fetch(`${this.config.baseUrl}/extract`, {
        method: "POST",
        headers: { "X-API-Key": this.config.apiKey },
        body: form,
        signal: AbortSignal.timeout(this.config.timeout),
      });

      let body: Record<string, unknown> = {};
      try {
        body = (await response.json()) as Record<string, unknown>;
      } catch {
        // Non-JSON response
      }

      if (response.status >= 400) {
        if (
          RETRYABLE_STATUS_CODES.has(response.status) &&
          attempt < this.config.maxRetries
        ) {
          lastError = { statusCode: response.status, body };
          continue;
        }
        raiseForStatus(
          response.status,
          ((body.traceId ?? body.TraceId) as string) || undefined,
          ((body.messages ?? body.Messages) as string[]) || undefined,
          ((body.timers ?? body.Timers) as Record<string, unknown>) || undefined
        );
      }

      return parseResponse(body);
    }

    // Should not reach here, but just in case
    throw lastError;
  }
}
