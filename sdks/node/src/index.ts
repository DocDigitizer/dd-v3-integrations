export { DocDigitizer } from "./client.js";
export type { ProcessOptions } from "./client.js";
export type { ClientConfig } from "./config.js";
export { resolveConfig } from "./config.js";
export {
  DocDigitizerError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  ServerError,
  ServiceUnavailableError,
  TimeoutError,
  raiseForStatus,
} from "./errors.js";
export type {
  PageRange,
  Extraction,
  ProcessingOutput,
  ProcessingResponse,
} from "./models.js";
export { parseResponse } from "./models.js";
