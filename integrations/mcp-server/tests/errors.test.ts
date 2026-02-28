import { describe, it, expect } from "vitest";
import {
  raiseForStatus,
  DocDigitizerError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  ServerError,
  ServiceUnavailableError,
  TimeoutError,
} from "../src/errors.js";

describe("raiseForStatus", () => {
  it("throws ValidationError for 400", () => {
    expect(() => raiseForStatus(400)).toThrow(ValidationError);
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

  it("throws base DocDigitizerError for unknown status", () => {
    expect(() => raiseForStatus(418)).toThrow(DocDigitizerError);
  });

  it("carries traceId and messages", () => {
    try {
      raiseForStatus(401, "TRACE1", ["Invalid API key"]);
    } catch (e) {
      const err = e as AuthenticationError;
      expect(err.statusCode).toBe(401);
      expect(err.traceId).toBe("TRACE1");
      expect(err.messages).toEqual(["Invalid API key"]);
    }
  });

  it("all error classes inherit from DocDigitizerError", () => {
    const classes = [
      AuthenticationError,
      ValidationError,
      RateLimitError,
      ServerError,
      ServiceUnavailableError,
      TimeoutError,
    ];
    for (const Cls of classes) {
      const instance = new Cls("test");
      expect(instance).toBeInstanceOf(DocDigitizerError);
      expect(instance).toBeInstanceOf(Error);
    }
  });
});
