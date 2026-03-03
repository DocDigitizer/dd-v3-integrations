export interface ClientConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
}

const DEFAULT_BASE_URL = "https://api.docdigitizer.com/v3/docingester";
const DEFAULT_TIMEOUT = 300_000; // 5 minutes
const DEFAULT_MAX_RETRIES = 3;

export function resolveConfig(
  options?: Partial<ClientConfig>
): ClientConfig {
  const apiKey =
    options?.apiKey ?? process.env.DOCDIGITIZER_API_KEY ?? "";
  if (!apiKey) {
    throw new Error(
      "API key is required. Pass { apiKey } or set DOCDIGITIZER_API_KEY."
    );
  }

  const baseUrl = (
    options?.baseUrl ??
    process.env.DOCDIGITIZER_BASE_URL ??
    DEFAULT_BASE_URL
  ).replace(/\/+$/, "");

  const timeout =
    options?.timeout ??
    (process.env.DOCDIGITIZER_TIMEOUT
      ? parseInt(process.env.DOCDIGITIZER_TIMEOUT, 10)
      : DEFAULT_TIMEOUT);

  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

  return { apiKey, baseUrl, timeout, maxRetries };
}
