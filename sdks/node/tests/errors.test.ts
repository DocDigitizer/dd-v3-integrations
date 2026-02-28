import { describe, it, expect } from "vitest";
import {
  DocDigitizerError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  ServerError,
  ServiceUnavailableError,
  TimeoutError,
  raiseForStatus,
} from "../src/errors.js";

describe("Error hierarchy", () => {
  it("all errors extend DocDigitizerError", () => {
    const errors = [
      new AuthenticationError("auth"),
      new ValidationError("val"),
      new RateLimitError("rate"),
      new ServerError("srv"),
      new ServiceUnavailableError("unavail"),
      new TimeoutError("timeout"),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(DocDigitizerError);
      expect(err).toBeInstanceOf(Error);
    }
  });

  it("carries statusCode, traceId, messages, timers", () => {
    const err = new DocDigitizerError(
      "test",
      400,
      "TRACE1",
      ["msg1", "msg2"],
      { total: 123 }
    );
    expect(err.message).toBe("test");
    expect(err.statusCode).toBe(400);
    expect(err.traceId).toBe("TRACE1");
    expect(err.messages).toEqual(["msg1", "msg2"]);
    expect(err.timers).toEqual({ total: 123 });
  });

  it("has correct name for each error class", () => {
    expect(new AuthenticationError("x").name).toBe("AuthenticationError");
    expect(new ValidationError("x").name).toBe("ValidationError");
    expect(new RateLimitError("x").name).toBe("RateLimitError");
    expect(new ServerError("x").name).toBe("ServerError");
    expect(new ServiceUnavailableError("x").name).toBe("ServiceUnavailableError");
    expect(new TimeoutError("x").name).toBe("TimeoutError");
  });
});

describe("raiseForStatus", () => {
  it("throws ValidationError for 400", () => {
    expect(() => raiseForStatus(400, "T1", ["bad request"])).toThrow(
      ValidationError
    );
  });

  it("throws AuthenticationError for 401", () => {
    expect(() => raiseForStatus(401)).toThrow(AuthenticationError);
  });

  it("throws RateLimitError for 429", () => {
    expect(() => raiseForStatus(429)).toThrow(RateLimitError);
  });

  it("throws ServerError for 500", () => {
    expect(() => raiseForStatus(500)).toThrow(ServerError);
  });

  it("throws ServiceUnavailableError for 503", () => {
    expect(() => raiseForStatus(503)).toThrow(ServiceUnavailableError);
  });

  it("throws TimeoutError for 504", () => {
    expect(() => raiseForStatus(504)).toThrow(TimeoutError);
  });

  it("throws DocDigitizerError for unknown status codes", () => {
    expect(() => raiseForStatus(418)).toThrow(DocDigitizerError);
  });

  it("joins messages into the error message", () => {
    try {
      raiseForStatus(400, undefined, ["err1", "err2"]);
    } catch (e) {
      expect((e as Error).message).toBe("err1; err2");
    }
  });

  it("falls back to HTTP status when no messages", () => {
    try {
      raiseForStatus(500);
    } catch (e) {
      expect((e as Error).message).toBe("HTTP 500");
    }
  });
});
