import { describe, it, expect } from "vitest";
import { ApiError } from "../../lib/apiError";
import { MAX_QUERY_RETRIES, shouldRetryQuery } from "../../lib/queryRetry";

const apiError = (status: number) => new ApiError({ status, message: `Fel: ${status}` });

describe("shouldRetryQuery", () => {
  it.each([400, 401, 403, 404, 409, 422, 429])("never retries a %i", (status) => {
    expect(shouldRetryQuery(0, apiError(status))).toBe(false);
  });

  it("retries a 5xx once", () => {
    expect(shouldRetryQuery(0, apiError(503))).toBe(true);
    expect(shouldRetryQuery(MAX_QUERY_RETRIES, apiError(503))).toBe(false);
  });

  it("retries a network error once", () => {
    const error = new TypeError("Failed to fetch");
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(MAX_QUERY_RETRIES, error)).toBe(false);
  });
});
