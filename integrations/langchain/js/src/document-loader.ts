import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { stat } from "node:fs/promises";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { Document } from "@langchain/core/documents";
import { DocDigitizer } from "docdigitizer";
import type { ProcessingResponse, Extraction } from "docdigitizer";

export interface DocDigitizerLoaderConfig {
  /** DocDigitizer API key. Falls back to DOCDIGITIZER_API_KEY env var. */
  apiKey?: string;
  /** API base URL override. */
  baseUrl?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Max retries on transient errors. */
  maxRetries?: number;
  /** Pipeline name for processing. */
  pipeline?: string;
  /** Format for pageContent: "json" (default), "text", or "kv". */
  contentFormat?: "json" | "text" | "kv";
}

/**
 * LangChain document loader for DocDigitizer.
 *
 * Processes PDF documents via the DocDigitizer API and returns
 * LangChain Document objects with extracted fields as pageContent
 * and document metadata (type, confidence, country, pages) in metadata.
 *
 * @example
 * ```typescript
 * const loader = new DocDigitizerLoader("invoice.pdf", { apiKey: "dd_live_..." });
 * const docs = await loader.load();
 * console.log(docs[0].pageContent); // JSON of extracted fields
 * console.log(docs[0].metadata.documentType); // "Invoice"
 * ```
 */
export class DocDigitizerLoader extends BaseDocumentLoader {
  private readonly client: DocDigitizer;
  private readonly filePath: string;
  private readonly pipeline?: string;
  private readonly contentFormat: string;

  constructor(filePath: string, config: DocDigitizerLoaderConfig = {}) {
    super();
    this.filePath = filePath;
    this.pipeline = config.pipeline;
    this.contentFormat = config.contentFormat ?? "json";
    this.client = new DocDigitizer({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
    });
  }

  async load(): Promise<Document[]> {
    const info = await stat(this.filePath);

    if (info.isDirectory()) {
      return this.loadDirectory(this.filePath);
    }

    return this.loadFile(this.filePath);
  }

  private async loadDirectory(dirPath: string): Promise<Document[]> {
    const entries = await readdir(dirPath);
    const pdfFiles = entries
      .filter((f) => extname(f).toLowerCase() === ".pdf")
      .sort();

    const documents: Document[] = [];
    for (const file of pdfFiles) {
      const docs = await this.loadFile(join(dirPath, file));
      documents.push(...docs);
    }
    return documents;
  }

  private async loadFile(filePath: string): Promise<Document[]> {
    const options: Record<string, string> = {};
    if (this.pipeline) {
      options.pipelineIdentifier = this.pipeline;
    }

    const response = await this.client.process({
      filePath,
      ...options,
    });

    return response.output?.extractions.map((extraction) =>
      new Document({
        pageContent: this.formatContent(extraction),
        metadata: this.buildMetadata(extraction, response, filePath),
      })
    ) ?? [];
  }

  private formatContent(extraction: Extraction): string {
    const data = extraction.extraction;
    if (this.contentFormat === "text") {
      return Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
    }
    if (this.contentFormat === "kv") {
      return Object.entries(data)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");
    }
    return JSON.stringify(data);
  }

  private buildMetadata(
    extraction: Extraction,
    response: ProcessingResponse,
    filePath: string
  ): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      source: filePath,
      documentType: extraction.documentType,
      confidence: extraction.confidence,
      countryCode: extraction.countryCode,
      pages: extraction.pages,
      traceId: response.traceId,
    };
    if (extraction.pageRange) {
      metadata.pageRange = extraction.pageRange;
    }
    if (extraction.schema) {
      metadata.schema = extraction.schema;
    }
    if (extraction.modelSource) {
      metadata.modelSource = extraction.modelSource;
    }
    if (response.pipeline) {
      metadata.pipeline = response.pipeline;
    }
    if (response.numPages) {
      metadata.numPages = response.numPages;
    }
    return metadata;
  }
}
