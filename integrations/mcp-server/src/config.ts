export interface Config {
  apiKey: string;
  baseUrl: string;
  timeout: number;
}

const DEFAULT_BASE_URL = "https://api.docdigitizer.com/v3/docingester";
const DEFAULT_TIMEOUT = 300_000; // 5 minutes

export function loadConfig(): Config {
  const apiKey = process.env.DOCDIGITIZER_API_KEY ?? "";
  if (!apiKey) {
    throw new Error(
      "DOCDIGITIZER_API_KEY is required. Set it as an environment variable."
    );
  }

  const baseUrl = (
    process.env.DOCDIGITIZER_BASE_URL ?? DEFAULT_BASE_URL
  ).replace(/\/+$/, "");

  const timeout = process.env.DOCDIGITIZER_TIMEOUT
    ? parseInt(process.env.DOCDIGITIZER_TIMEOUT, 10)
    : DEFAULT_TIMEOUT;

  return { apiKey, baseUrl, timeout };
}
