export class DocDigitizerError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly traceId?: string,
    public readonly messages?: string[],
    public readonly timers?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DocDigitizerError";
  }
}

export class AuthenticationError extends DocDigitizerError {
  constructor(...args: ConstructorParameters<typeof DocDigitizerError>) {
    super(...args);
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends DocDigitizerError {
  constructor(...args: ConstructorParameters<typeof DocDigitizerError>) {
    super(...args);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends DocDigitizerError {
  constructor(...args: ConstructorParameters<typeof DocDigitizerError>) {
    super(...args);
    this.name = "RateLimitError";
  }
}

export class ServerError extends DocDigitizerError {
  constructor(...args: ConstructorParameters<typeof DocDigitizerError>) {
    super(...args);
    this.name = "ServerError";
  }
}

export class ServiceUnavailableError extends DocDigitizerError {
  constructor(...args: ConstructorParameters<typeof DocDigitizerError>) {
    super(...args);
    this.name = "ServiceUnavailableError";
  }
}

export class TimeoutError extends DocDigitizerError {
  constructor(...args: ConstructorParameters<typeof DocDigitizerError>) {
    super(...args);
    this.name = "TimeoutError";
  }
}

const STATUS_CODE_MAP: Record<number, typeof DocDigitizerError> = {
  400: ValidationError,
  401: AuthenticationError,
  429: RateLimitError,
  500: ServerError,
  503: ServiceUnavailableError,
  504: TimeoutError,
};

export function raiseForStatus(
  statusCode: number,
  traceId?: string,
  messages?: string[],
  timers?: Record<string, unknown>
): never {
  const ErrorClass = STATUS_CODE_MAP[statusCode] ?? DocDigitizerError;
  const msg = messages?.join("; ") ?? `HTTP ${statusCode}`;
  throw new ErrorClass(msg, statusCode, traceId, messages, timers);
}

/** Status codes eligible for retry with exponential backoff. */
export const RETRYABLE_STATUS_CODES = new Set([429, 500, 503, 504]);
