import { describe, it, expect } from "vitest";
import {
  ApiError,
  RATE_LIMIT_GENERIC_MESSAGE,
  SERVER_ERROR_MESSAGE,
  fieldOf,
  formatRateLimitMessage,
  isRateLimitError,
  parseRetryAfter,
  toApiError,
} from "../../lib/apiError";

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

describe("parseRetryAfter", () => {
  it("reads whole seconds", () => {
    expect(parseRetryAfter("120")).toBe(120);
  });

  it("ignores surrounding whitespace", () => {
    expect(parseRetryAfter(" 7 ")).toBe(7);
  });

  it("returns null when the header is missing", () => {
    expect(parseRetryAfter(null)).toBeNull();
  });

  it.each(["", "abc", "-5", "1.5", "10s"])("returns null for unreadable value %j", (value) => {
    expect(parseRetryAfter(value)).toBeNull();
  });

  it("converts an HTTP-date into seconds from now", () => {
    const now = Date.parse("2026-11-13T10:00:00Z");
    expect(parseRetryAfter("Fri, 13 Nov 2026 10:01:30 GMT", now)).toBe(90);
  });

  it("returns 0 for an HTTP-date in the past", () => {
    const now = Date.parse("2026-11-13T10:00:00Z");
    expect(parseRetryAfter("Fri, 13 Nov 2026 09:00:00 GMT", now)).toBe(0);
  });
});

describe("formatRateLimitMessage", () => {
  it("uses a generic message when the wait is unknown", () => {
    expect(formatRateLimitMessage(null)).toBe(RATE_LIMIT_GENERIC_MESSAGE);
    expect(formatRateLimitMessage(0)).toBe(RATE_LIMIT_GENERIC_MESSAGE);
  });

  it("uses seconds below one minute", () => {
    expect(formatRateLimitMessage(1)).toBe("För många försök. Försök igen om 1 sekund.");
    expect(formatRateLimitMessage(45)).toBe("För många försök. Försök igen om 45 sekunder.");
  });

  it("rounds up to whole minutes", () => {
    expect(formatRateLimitMessage(60)).toBe("För många försök. Försök igen om ungefär 1 minut.");
    expect(formatRateLimitMessage(61)).toBe("För många försök. Försök igen om ungefär 2 minuter.");
    expect(formatRateLimitMessage(900)).toBe(
      "För många försök. Försök igen om ungefär 15 minuter."
    );
  });
});

describe("toApiError", () => {
  it("parses a 429 with Retry-After into the error", async () => {
    const error = await toApiError(
      json(429, { detail: "Too many requests. Please try again later." }, { "Retry-After": "300" })
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(429);
    expect(error.retryAfterSeconds).toBe(300);
    expect(error.isRateLimited).toBe(true);
    expect(isRateLimitError(error)).toBe(true);
    expect(error.message).toBe("För många försök. Försök igen om ungefär 5 minuter.");
  });

  it("parses a 429 without Retry-After into a generic message", async () => {
    const error = await toApiError(json(429, { detail: "Too many requests." }));

    expect(error.retryAfterSeconds).toBeNull();
    expect(error.message).toBe(RATE_LIMIT_GENERIC_MESSAGE);
  });

  it("uses the string detail of a 4xx as the message", async () => {
    const error = await toApiError(json(401, { detail: "Invalid credentials" }));

    expect(error.status).toBe(401);
    expect(error.detail).toBe("Invalid credentials");
    expect(error.message).toBe("Invalid credentials");
    expect(error.retryAfterSeconds).toBeNull();
  });

  it("reads 422 issues with loc, msg and type only", async () => {
    const error = await toApiError(
      json(422, {
        detail: [
          {
            loc: ["body", "username"],
            msg: "String should have at most 200 characters",
            type: "string_too_long",
          },
          { loc: ["body", "password"], msg: "Field required", type: "missing" },
        ],
      })
    );

    expect(error.status).toBe(422);
    expect(error.validationIssues).toEqual([
      {
        loc: ["body", "username"],
        msg: "String should have at most 200 characters",
        type: "string_too_long",
      },
      { loc: ["body", "password"], msg: "Field required", type: "missing" },
    ]);
    expect(error.validationIssues.map(fieldOf)).toEqual(["username", "password"]);
    expect(error.message).toBe("String should have at most 200 characters; Field required");
  });

  it("never uses the body of a 500", async () => {
    const error = await toApiError(new Response("Traceback: secret stuff", { status: 500 }));

    expect(error.status).toBe(500);
    expect(error.message).toBe(SERVER_ERROR_MESSAGE);
    expect(error.message).not.toContain("Traceback");
  });

  it("never uses a non-JSON body of a 4xx", async () => {
    const error = await toApiError(new Response("<html>Bad gateway</html>", { status: 404 }));

    expect(error.message).toBe("Fel: 404");
    expect(error.detail).toBeNull();
  });

  it("falls back to the status when detail is not a string or list", async () => {
    const error = await toApiError(json(400, { detail: { nested: true } }));

    expect(error.message).toBe("Fel: 400");
  });
});

describe("fieldOf", () => {
  it("returns null when the issue is about the whole body", () => {
    expect(fieldOf({ loc: ["body"], msg: "x", type: null })).toBeNull();
  });
});
