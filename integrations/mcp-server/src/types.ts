export interface PageRange {
  start: number;
  end: number;
}

export interface Extraction {
  documentType: string;
  confidence: number;
  countryCode: string;
  pages: number[];
  pageRange?: PageRange;
  extraction: Record<string, unknown>;
  schema?: string;
  modelSource?: string;
}

export interface ProcessingOutput {
  extractions: Extraction[];
}

export interface ProcessingResponse {
  state: string;
  traceId: string;
  pipeline?: string;
  numPages?: number;
  output?: ProcessingOutput;
  timers?: Record<string, unknown>;
  messages?: string[];
}

function get(
  data: Record<string, unknown>,
  camel: string,
  pascal: string,
  fallback?: unknown
): unknown {
  if (camel in data) return data[camel];
  if (pascal in data) return data[pascal];
  return fallback;
}

function parseExtraction(raw: Record<string, unknown>): Extraction {
  const pages = (raw.pages ?? []) as number[];
  const pageRangeRaw = raw.pageRange as
    | { start: number; end: number }
    | undefined;
  let pageRange: PageRange | undefined;

  if (pageRangeRaw && typeof pageRangeRaw === "object") {
    pageRange = { start: pageRangeRaw.start, end: pageRangeRaw.end };
  } else if (pages.length > 0) {
    pageRange = { start: Math.min(...pages), end: Math.max(...pages) };
  }

  return {
    documentType: (get(raw, "docType", "documentType", "") as string),
    confidence: (raw.confidence ?? 0) as number,
    countryCode: (get(raw, "country", "countryCode", "") as string),
    pages,
    pageRange,
    extraction: (raw.extraction ?? {}) as Record<string, unknown>,
    schema: raw.schema as string | undefined,
    modelSource: raw.modelSource as string | undefined,
  };
}

function parseOutput(
  raw: unknown
): ProcessingOutput | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const rawExtractions = (obj.extractions ?? []) as Record<string, unknown>[];
  return {
    extractions: rawExtractions.map(parseExtraction),
  };
}

export function parseResponse(
  data: Record<string, unknown>
): ProcessingResponse {
  return {
    state: get(data, "stateText", "StateText", "") as string,
    traceId: get(data, "traceId", "TraceId", "") as string,
    pipeline: get(data, "pipeline", "Pipeline") as string | undefined,
    numPages: get(data, "numberPages", "NumberPages") as number | undefined,
    output: parseOutput(get(data, "output", "Output")),
    timers: get(data, "timers", "Timers") as
      | Record<string, unknown>
      | undefined,
    messages: get(data, "messages", "Messages") as string[] | undefined,
  };
}
