import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  clearTokens,
  getAccessToken,
  initializeAuth,
  isLoggedIn,
  switchSession,
  clearCache,
  tokens,
  api,
} from "../../lib/apiClient";
import { ApiError, SERVER_ERROR_MESSAGE } from "../../lib/apiError";

// Reset all token/session state before each test
beforeEach(() => {
  clearTokens();
  clearCache();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// ----------------------------------------------------------------
// Token helpers
// ----------------------------------------------------------------

describe("isLoggedIn", () => {
  it("returns false when no refresh token is stored", () => {
    expect(isLoggedIn()).toBe(false);
  });

  it("returns true after saving tokens", () => {
    tokens.saveTokens({ access_token: "acc", refresh_token: "ref" });
    expect(isLoggedIn()).toBe(true);
  });

  it("returns false after clearing tokens", () => {
    tokens.saveTokens({ access_token: "acc", refresh_token: "ref" });
    clearTokens();
    expect(isLoggedIn()).toBe(false);
  });
});

describe("getAccessToken", () => {
  it("returns null initially", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("returns the token after saveTokens", () => {
    tokens.saveTokens({ access_token: "my-access-token", refresh_token: "ref" });
    expect(getAccessToken()).toBe("my-access-token");
  });

  it("returns null after clearTokens", () => {
    tokens.saveTokens({ access_token: "my-access-token", refresh_token: "ref" });
    clearTokens();
    expect(getAccessToken()).toBeNull();
  });
});

describe("switchSession", () => {
  it("sets the access token", () => {
    switchSession("new-access", "new-refresh");
    expect(getAccessToken()).toBe("new-access");
  });

  it("stores the refresh token in sessionStorage", () => {
    switchSession("new-access", "new-refresh");
    expect(sessionStorage.getItem("refresh_token")).toBe("new-refresh");
  });

  it("isLoggedIn returns true after switchSession", () => {
    switchSession("new-access", "new-refresh");
    expect(isLoggedIn()).toBe(true);
  });

  it("replaces a previous session", () => {
    tokens.saveTokens({ access_token: "old-access", refresh_token: "old-refresh" });
    switchSession("new-access", "new-refresh");
    expect(getAccessToken()).toBe("new-access");
    expect(sessionStorage.getItem("refresh_token")).toBe("new-refresh");
  });
});

describe("clearTokens", () => {
  it("clears the access token", () => {
    tokens.saveTokens({ access_token: "acc", refresh_token: "ref" });
    clearTokens();
    expect(getAccessToken()).toBeNull();
  });

  it("removes refresh_token from sessionStorage", () => {
    tokens.saveTokens({ access_token: "acc", refresh_token: "ref" });
    clearTokens();
    expect(sessionStorage.getItem("refresh_token")).toBeNull();
  });

  it("is idempotent — clearing twice does not throw", () => {
    expect(() => {
      clearTokens();
      clearTokens();
    }).not.toThrow();
  });
});

// ----------------------------------------------------------------
// API methods — fetch mocking
// ----------------------------------------------------------------

const mockFetch = (status: number, body: unknown) => {
  return vi.spyOn(global, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
  } as Response);
};

describe("api.get", () => {
  it("parses a successful JSON response", async () => {
    mockFetch(200, { id: 1, name: "Test" });
    const result = await api.get<{ id: number; name: string }>("/some/path");
    expect(result).toEqual({ id: 1, name: "Test" });
  });

  it("throws on a non-OK response", async () => {
    mockFetch(404, "Not found");
    await expect(api.get("/missing")).rejects.toThrow();
  });

  it("returns null for empty response body", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(""),
    } as Response);
    const result = await api.get("/empty");
    expect(result).toBeNull();
  });
});

describe("api.post", () => {
  it("sends a POST request with JSON body", async () => {
    const spy = mockFetch(201, { id: 42 });
    await api.post("/resource", { name: "new" });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/resource"),
      expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "new" }) })
    );
  });

  it("throws on error response", async () => {
    mockFetch(400, "Bad request");
    await expect(api.post("/resource", {})).rejects.toThrow();
  });
});

describe("api.patch", () => {
  it("sends a PATCH request with JSON body", async () => {
    const spy = mockFetch(200, { id: 1 });
    await api.patch("/resource/1", { name: "updated" });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/resource/1"),
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ name: "updated" }) })
    );
  });
});

describe("api.delete", () => {
  it("sends a DELETE request", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(""),
    } as Response);
    await api.delete("/resource/1");
    // Just verify it doesn't throw
  });

  it("throws on error response", async () => {
    mockFetch(403, "Forbidden");
    await expect(api.delete("/resource/1")).rejects.toThrow();
  });
});

// ----------------------------------------------------------------
// Error bodies
// ----------------------------------------------------------------

describe("error responses", () => {
  it("rejects with an ApiError carrying the status and detail", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Invalid credentials" }), { status: 401 })
    );

    const error = await api.post("/auth/login", {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, message: "Invalid credentials" });
  });

  it("never puts the raw body of a 500 in the message", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("<html>stack trace</html>", { status: 500 })
    );

    await expect(api.get("/boom")).rejects.toThrow(SERVER_ERROR_MESSAGE);
  });

  it("reads Retry-After from a 429 on an auth endpoint", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { "Retry-After": "42" },
      })
    );

    const error = await api.post("/auth/login", {}).catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 429, retryAfterSeconds: 42 });
  });
});

// ----------------------------------------------------------------
// Token refresh — at most one refresh and one retry, never a loop
// ----------------------------------------------------------------

type Route = (url: string) => Response;

/** Mock fetch, answering /auth/refresh with `refresh` and everything else with `other`. */
function mockRoutes(other: Route, refresh: Route) {
  return vi.spyOn(global, "fetch").mockImplementation((input) => {
    const url = String(input);
    return Promise.resolve(url.endsWith("/auth/refresh") ? refresh(url) : other(url));
  });
}

const unauthorized = () => new Response(JSON.stringify({ detail: "Expired" }), { status: 401 });
const tooManyRequests = (retryAfter?: string) =>
  new Response(JSON.stringify({ detail: "Too many requests. Please try again later." }), {
    status: 429,
    headers: retryAfter ? { "Retry-After": retryAfter } : {},
  });
const tokenPair = () =>
  new Response(JSON.stringify({ access_token: "new-acc", refresh_token: "new-ref" }), {
    status: 200,
  });

const refreshCalls = (spy: ReturnType<typeof mockRoutes>) =>
  spy.mock.calls.filter(([input]) => String(input).endsWith("/auth/refresh")).length;

describe("token refresh", () => {
  beforeEach(() => {
    tokens.saveTokens({ access_token: "old-acc", refresh_token: "old-ref" });
  });

  it("refreshes once on a 401 and retries the request once", async () => {
    let first = true;
    const spy = mockRoutes(
      () => {
        if (first) {
          first = false;
          return unauthorized();
        }
        return new Response(JSON.stringify({ id: 1 }), { status: 200 });
      },
      () => tokenPair()
    );

    await expect(api.get("/climber/me", true)).resolves.toEqual({ id: 1 });
    expect(spy).toHaveBeenCalledTimes(3);
    expect(getAccessToken()).toBe("new-acc");
  });

  it("does not loop when the retried request is still a 401", async () => {
    const spy = mockRoutes(unauthorized, tokenPair);

    await expect(api.get("/climber/me", true)).rejects.toMatchObject({ status: 401 });
    expect(spy).toHaveBeenCalledTimes(3); // request, refresh, one retry
    expect(refreshCalls(spy)).toBe(1);
  });

  it("keeps the session and reports the wait when refresh answers 429", async () => {
    const spy = mockRoutes(unauthorized, () => tooManyRequests("120"));

    await expect(api.get("/climber/me", true)).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 120,
    });
    expect(spy).toHaveBeenCalledTimes(2); // request, refresh — no retry
    expect(isLoggedIn()).toBe(true);
    expect(sessionStorage.getItem("refresh_token")).toBe("old-ref");
  });

  it("does not call refresh again until Retry-After has passed", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-13T10:00:00Z"));
    const spy = mockRoutes(unauthorized, () => tooManyRequests("60"));

    await expect(api.get("/climber/me", true)).rejects.toMatchObject({ status: 429 });
    expect(refreshCalls(spy)).toBe(1);

    vi.setSystemTime(new Date("2026-11-13T10:00:45Z"));
    await expect(api.get("/climber/me", true)).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 15,
    });
    expect(refreshCalls(spy)).toBe(1);

    vi.setSystemTime(new Date("2026-11-13T10:01:01Z"));
    await expect(api.get("/climber/me", true)).rejects.toMatchObject({ status: 429 });
    expect(refreshCalls(spy)).toBe(2);
  });

  it("backs off for a default time when the 429 has no Retry-After", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-13T10:00:00Z"));
    const spy = mockRoutes(unauthorized, () => tooManyRequests());

    await expect(api.get("/climber/me", true)).rejects.toMatchObject({ status: 429 });
    await expect(api.get("/climber/me", true)).rejects.toMatchObject({ status: 429 });
    expect(refreshCalls(spy)).toBe(1);
  });

  it("logs out when the refresh token is rejected", async () => {
    const spy = mockRoutes(unauthorized, unauthorized);

    await expect(api.get("/climber/me", true)).rejects.toMatchObject({
      status: 401,
      message: "Autentisering misslyckades",
    });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(isLoggedIn()).toBe(false);
  });

  it("keeps the session when refresh fails with a 5xx", async () => {
    mockRoutes(unauthorized, () => new Response("oops", { status: 503 }));

    await expect(api.get("/climber/me", true)).rejects.toThrow(SERVER_ERROR_MESSAGE);
    expect(isLoggedIn()).toBe(true);
  });

  it("shares one refresh between concurrent 401s", async () => {
    const spy = mockRoutes(unauthorized, () => tooManyRequests("30"));

    const results = await Promise.allSettled([
      api.get("/a", true),
      api.get("/b", true),
      api.get("/c", true),
    ]);

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(refreshCalls(spy)).toBe(1);
  });
});

describe("initializeAuth", () => {
  beforeEach(() => {
    sessionStorage.setItem("refresh_token", "stored-ref");
  });

  it("keeps the session when refresh answers 429", async () => {
    const spy = mockRoutes(unauthorized, () => tooManyRequests("10"));

    await expect(initializeAuth()).resolves.toBeUndefined();
    expect(refreshCalls(spy)).toBe(1);
    expect(isLoggedIn()).toBe(true);
  });

  it("resolves and keeps the session when the network fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(initializeAuth()).resolves.toBeUndefined();
    expect(isLoggedIn()).toBe(true);
  });
});
