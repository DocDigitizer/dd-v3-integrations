import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { randomUUID } from "node:crypto";
import type { Config } from "./config.js";
import type { ProcessingResponse } from "./types.js";
import { parseResponse } from "./types.js";
import { raiseForStatus } from "./errors.js";

export class ApiClient {
  constructor(private readonly config: Config) {}

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

  async processDocument(options: {
    filePath?: string;
    fileContent?: string;
    fileName?: string;
    id?: string;
    contextId?: string;
    pipelineIdentifier?: string;
    requestToken?: string;
  }): Promise<ProcessingResponse> {
    let fileBuffer: Buffer;
    let fileName: string;

    if (options.filePath) {
      fileBuffer = await readFile(options.filePath);
      fileName = options.fileName ?? basename(options.filePath);
    } else if (options.fileContent) {
      fileBuffer = Buffer.from(options.fileContent, "base64");
      fileName = options.fileName ?? "document.pdf";
    } else {
      throw new Error("Either filePath or fileContent (base64) is required");
    }

    const form = new FormData();
    const blob = new Blob([fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    )] as BlobPart[], { type: "application/pdf" });
    form.append("files", blob, fileName);
    form.append("id", options.id ?? randomUUID());
    form.append("contextID", options.contextId ?? randomUUID());

    if (options.pipelineIdentifier) {
      form.append("pipelineIdentifier", options.pipelineIdentifier);
    }
    if (options.requestToken) {
      form.append("requestToken", options.requestToken);
    }

    const response = await fetch(`${this.config.baseUrl}/`, {
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
      raiseForStatus(
        response.status,
        ((body.traceId ?? body.TraceId) as string) || undefined,
        ((body.messages ?? body.Messages) as string[]) || undefined,
        ((body.timers ?? body.Timers) as Record<string, unknown>) || undefined
      );
    }

    return parseResponse(body);
  }
}
