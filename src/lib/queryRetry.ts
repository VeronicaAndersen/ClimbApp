import { isApiError } from "./apiError";

/** Retries for a failed query, after the first attempt. */
export const MAX_QUERY_RETRIES = 1;

/**
 * TanStack Query `retry` callback. A 4xx (401, 422, 429 and the rest) will
 * not change on a retry, and retrying a 429 makes the wait longer, so only
 * network errors and 5xx responses are retried, once.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.isClientError) return false;
  return failureCount < MAX_QUERY_RETRIES;
}
