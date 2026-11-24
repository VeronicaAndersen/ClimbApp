import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  clearTokens,
  getAccessToken,
  initializeAuth,
  isLoggedIn,
  SESSION_CHANGED_MESSAGE,
  REFRESH_TIMEOUT_MESSAGE,
  REFRESH_TIMEOUT_MS,
  switchSession,
  clearCache,
  tokens,
  api,
} from "../../lib/apiClient";
import { ApiError, SERVER_ERROR_MESSAGE } from "../../lib/apiError";
import { queryClient } from "../../lib/queryClient";

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

describe("caches on account change", () => {
  const getTwice = async (changeAccount: () => void) => {
    const spy = mockFetch(200, { id: 1 });
    await api.get("/cached");
    changeAccount();
    await api.get("/cached");
    return spy.mock.calls.length;
  };

  it("serves a repeated GET from the cache for the same account", async () => {
    expect(await getTwice(() => {})).toBe(1);
  });

  it.each([
    ["logout", () => clearTokens()],
    ["login", () => tokens.saveTokens({ access_token: "a2", refresh_token: "r2" })],
    ["session switch", () => switchSession("a3", "r3")],
  ])("drops cached GET responses on %s", async (_name, changeAccount) => {
    expect(await getTwice(changeAccount)).toBe(2);
  });

  it("drops react-query data on logout", () => {
    queryClient.setQueryData(["climbers"], [{ id: 1 }]);
    clearTokens();
    expect(queryClient.getQueryData(["climbers"])).toBeUndefined();
  });

  // The keys of the per-user hooks (useGetUserInfo, useUserCompetitions,
  // useMyRegistrations, useScores) rely on this reset to avoid leaking data.
  it.each([
    [["myInfo"]],
    [["userCompetitions"]],
    [["myRegistrations"]],
    [["scores", 3, undefined]],
  ])("drops per-user query %j on logout", (queryKey) => {
    queryClient.setQueryData(queryKey, { id: 1 });
    clearTokens();
    expect(queryClient.getQueryData(queryKey)).toBeUndefined();
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

  it("drops the cached list after a 204 response", async () => {
    const spy = vi.spyOn(global, "fetch");
    spy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify([{ id: 1 }, { id: 2 }])),
    } as Response);
    await api.get("/competition");

    spy.mockResolvedValueOnce({
      ok: true,
      status: 204,
      text: () => Promise.resolve(""),
    } as Response);
    await api.delete("/competition/1");

    spy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify([{ id: 2 }])),
    } as Response);
    expect(await api.get("/competition")).toEqual([{ id: 2 }]);
    expect(spy).toHaveBeenCalledTimes(3);
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

  it("logs out on a 400, 403 or 422 from refresh", async () => {
    for (const status of [400, 403, 422]) {
      tokens.saveTokens({ access_token: "old-acc", refresh_token: "old-ref" });
      mockRoutes(unauthorized, () => new Response("{}", { status }));

      await expect(api.get("/climber/me", true)).rejects.toMatchObject({ status: 401 });
      expect(isLoggedIn()).toBe(false);
      vi.restoreAllMocks();
    }
  });

  it.each([404, 408, 425])("keeps the session on a %i from refresh", async (status) => {
    mockRoutes(unauthorized, () => new Response("{}", { status }));

    await expect(api.get("/climber/me", true)).rejects.toMatchObject({ status: 401 });
    expect(isLoggedIn()).toBe(true);
    expect(sessionStorage.getItem("refresh_token")).toBe("old-ref");
  });

  it("caps a huge Retry-After from refresh at one hour", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-13T10:00:00Z"));
    const spy = mockRoutes(unauthorized, () => tooManyRequests("999999"));

    await expect(api.get("/climber/me", true)).rejects.toMatchObject({ status: 429 });
    vi.setSystemTime(new Date("2026-11-13T11:00:01Z"));
    await expect(api.get("/climber/me", true)).rejects.toMatchObject({ status: 429 });

    expect(refreshCalls(spy)).toBe(2);
  });
});

// ----------------------------------------------------------------
// Refresh vs. session changes — a refresh result only applies to the
// session it was started for
// ----------------------------------------------------------------

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function bearerOf(init: RequestInit | undefined): string | null {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  return headers.Authorization ?? null;
}

/** Authorization headers of all non-refresh requests, in order. */
const usedBearers = (spy: { mock: { calls: [RequestInfo | URL, RequestInit?][] } }) =>
  spy.mock.calls
    .filter(([input]) => !String(input).endsWith("/auth/refresh"))
    .map(([, init]) => bearerOf(init));

const ok = (body: unknown = { ok: true }) => new Response(JSON.stringify(body), { status: 200 });
const pair = (access: string, refresh: string) =>
  new Response(JSON.stringify({ access_token: access, refresh_token: refresh }), { status: 200 });

/**
 * Mock API: requests with a bearer in `validTokens` succeed, others get 401.
 * /auth/refresh answers with `refresh()`.
 */
function mockServer(validTokens: string[], refresh: () => Promise<Response>) {
  return vi.spyOn(global, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/refresh")) return refresh();
    const bearer = bearerOf(init);
    const valid = validTokens.some((token) => bearer === `Bearer ${token}`);
    return Promise.resolve(valid ? ok({ url }) : unauthorized());
  });
}

describe("refresh and session changes", () => {
  beforeEach(() => {
    tokens.saveTokens({ access_token: "A-acc", refresh_token: "A-ref" });
  });

  it("keeps the session the user switched to during a refresh", async () => {
    const refresh = deferred<Response>();
    const spy = mockServer(["A2-acc", "B-acc"], () => refresh.promise);

    const request = api.get("/climber/me", true);
    await vi.waitFor(() => expect(refreshCalls(spy)).toBe(1));

    switchSession("B-acc", "B-ref");
    refresh.resolve(pair("A2-acc", "A2-ref"));

    // A's request is rejected, not replayed as B.
    await expect(request).rejects.toMatchObject({
      status: 401,
      message: SESSION_CHANGED_MESSAGE,
    });
    expect(getAccessToken()).toBe("B-acc");
    expect(sessionStorage.getItem("refresh_token")).toBe("B-ref");
    expect(usedBearers(spy)).not.toContain("Bearer B-acc");
  });

  it("keeps a login that happened during a refresh", async () => {
    const refresh = deferred<Response>();
    const spy = mockServer(["B-acc"], () => refresh.promise);

    const request = api.get("/climber/me", true);
    await vi.waitFor(() => expect(refreshCalls(spy)).toBe(1));

    tokens.saveTokens({ access_token: "B-acc", refresh_token: "B-ref" });
    refresh.resolve(pair("A2-acc", "A2-ref"));

    await expect(request).rejects.toMatchObject({ message: SESSION_CHANGED_MESSAGE });
    expect(usedBearers(spy)).not.toContain("Bearer B-acc");
    expect(getAccessToken()).toBe("B-acc");
    expect(sessionStorage.getItem("refresh_token")).toBe("B-ref");
  });

  it("does not bring tokens back after a logout during a refresh", async () => {
    const refresh = deferred<Response>();
    const spy = mockServer(["A2-acc"], () => refresh.promise);

    const request = api.get("/climber/me", true);
    await vi.waitFor(() => expect(refreshCalls(spy)).toBe(1));

    clearTokens();
    refresh.resolve(pair("A2-acc", "A2-ref"));

    await expect(request).rejects.toMatchObject({ status: 401 });
    expect(getAccessToken()).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });

  it("does not clear the switched-to session when the old refresh is rejected", async () => {
    const refresh = deferred<Response>();
    const spy = mockServer(["B-acc"], () => refresh.promise);

    const request = api.get("/climber/me", true);
    await vi.waitFor(() => expect(refreshCalls(spy)).toBe(1));

    switchSession("B-acc", "B-ref");
    refresh.resolve(unauthorized());

    await expect(request).rejects.toMatchObject({ status: 401 });
    expect(usedBearers(spy)).not.toContain("Bearer B-acc");
    expect(getAccessToken()).toBe("B-acc");
    expect(sessionStorage.getItem("refresh_token")).toBe("B-ref");
  });

  it("does not let an old 429 block refreshes of the new session", async () => {
    const refresh = deferred<Response>();
    const spy = mockServer([], () => refresh.promise);

    const request = api.get("/climber/me", true);
    await vi.waitFor(() => expect(refreshCalls(spy)).toBe(1));
    switchSession("B-acc", "B-ref");
    refresh.resolve(tooManyRequests("600"));
    await request.catch(() => undefined);

    spy.mockRestore();
    const next = mockServer(["B2-acc"], () => Promise.resolve(pair("B2-acc", "B2-ref")));
    tokens.saveTokens({ access_token: "B-acc", refresh_token: "B-ref" });

    await expect(api.get("/climber/me", true)).resolves.toBeTruthy();
    expect(refreshCalls(next)).toBe(1);
  });

  it("never replays a write for A as B when the user switches before the 401", async () => {
    const response = deferred<Response>();
    const spy = vi
      .spyOn(global, "fetch")
      .mockImplementation((input) =>
        String(input).endsWith("/auth/refresh")
          ? Promise.resolve(pair("A2-acc", "A2-ref"))
          : response.promise
      );

    const write = api.patch("/climber/me", { firstname: "Anna" }, true);
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    switchSession("B-acc", "B-ref");
    response.resolve(unauthorized()); // A's 401 arrives after the switch

    await expect(write).rejects.toMatchObject({ status: 401, message: SESSION_CHANGED_MESSAGE });
    expect(spy).toHaveBeenCalledTimes(1); // no refresh, no retry
    expect(usedBearers(spy)).toEqual(["Bearer A-acc"]);
  });

  it("does not retry a request when the user logs out before its 401", async () => {
    const response = deferred<Response>();
    const spy = vi
      .spyOn(global, "fetch")
      .mockImplementation((input) =>
        String(input).endsWith("/auth/refresh")
          ? Promise.resolve(pair("A2-acc", "A2-ref"))
          : response.promise
      );

    const request = api.get("/climber/me", true);
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    clearTokens();
    response.resolve(unauthorized());

    await expect(request).rejects.toMatchObject({ status: 401, message: SESSION_CHANGED_MESSAGE });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(isLoggedIn()).toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  it("shares one refresh between concurrent 401s and retries all with the new token", async () => {
    const refresh = deferred<Response>();
    const spy = mockServer(["new-acc"], () => refresh.promise);

    const requests = [api.get("/a", true), api.get("/b", true), api.get("/c", true)];
    await vi.waitFor(() => expect(refreshCalls(spy)).toBe(1));
    // All three have had their 401 before the refresh finishes.
    expect(spy.mock.calls.filter(([, init]) => bearerOf(init) === "Bearer A-acc")).toHaveLength(3);

    refresh.resolve(pair("new-acc", "new-ref"));

    await expect(Promise.all(requests)).resolves.toHaveLength(3);
    expect(refreshCalls(spy)).toBe(1);
    expect(spy.mock.calls.filter(([, init]) => bearerOf(init) === "Bearer new-acc")).toHaveLength(
      3
    );
  });

  it("retries a late 401 for an already replaced token without a second refresh", async () => {
    const lateResponse = deferred<Response>();
    const spy = vi.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) return Promise.resolve(pair("T2", "R2"));
      const bearer = bearerOf(init);
      if (bearer === "Bearer T2") return Promise.resolve(ok({ url }));
      if (url.endsWith("/slow")) return lateResponse.promise;
      return Promise.resolve(unauthorized());
    });
    tokens.saveTokens({ access_token: "T1", refresh_token: "R1" });

    const fast = api.get("/fast", true);
    const slow = api.get("/slow", true);
    await expect(fast).resolves.toBeTruthy();
    expect(getAccessToken()).toBe("T2");

    lateResponse.resolve(unauthorized()); // the 401 for T1 arrives after the refresh
    await expect(slow).resolves.toBeTruthy();

    expect(refreshCalls(spy)).toBe(1);
    const slowCalls = spy.mock.calls.filter(([input]) => String(input).endsWith("/slow"));
    expect(slowCalls.map(([, init]) => bearerOf(init))).toEqual(["Bearer T1", "Bearer T2"]);
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

// ----------------------------------------------------------------
// Refresh timeout — the shared refresh always settles
// ----------------------------------------------------------------

/** A fetch that never answers, but rejects like a real fetch when aborted. */
function hangingFetch(init: RequestInit | undefined): Promise<Response> {
  return new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () =>
      reject(new DOMException("Aborted", "AbortError"))
    );
  });
}

describe("refresh timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.setItem("refresh_token", "stored-ref");
  });

  it("lets startup render, and a later 401 starts a new refresh that succeeds", async () => {
    let refreshNo = 0;
    const spy = vi.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        refreshNo += 1;
        return refreshNo === 1 ? hangingFetch(init) : Promise.resolve(pair("new-acc", "new-ref"));
      }
      const valid = bearerOf(init) === "Bearer new-acc";
      return Promise.resolve(valid ? ok({ url }) : unauthorized());
    });

    const startup = initializeAuth();
    await vi.advanceTimersByTimeAsync(REFRESH_TIMEOUT_MS - 1);
    expect(refreshCalls(spy)).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(startup).resolves.toBeUndefined();
    expect(isLoggedIn()).toBe(true);
    expect(sessionStorage.getItem("refresh_token")).toBe("stored-ref");

    // The network is back: the next 401 must not join the hung refresh.
    await expect(api.get("/climber/me", true)).resolves.toBeTruthy();
    expect(refreshCalls(spy)).toBe(2);
    expect(getAccessToken()).toBe("new-acc");
  });

  it("settles every waiting request with a timeout error and keeps the session", async () => {
    const spy = vi
      .spyOn(global, "fetch")
      .mockImplementation((input, init) =>
        String(input).endsWith("/auth/refresh")
          ? hangingFetch(init)
          : Promise.resolve(unauthorized())
      );
    tokens.saveTokens({ access_token: "old-acc", refresh_token: "old-ref" });

    const requests = [api.get("/a", true), api.get("/b", true), api.get("/c", true)].map((p) =>
      p.catch((e: unknown) => e)
    );
    await vi.advanceTimersByTimeAsync(REFRESH_TIMEOUT_MS);

    const errors = await Promise.all(requests);
    for (const error of errors) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 0, message: REFRESH_TIMEOUT_MESSAGE });
    }
    expect(refreshCalls(spy)).toBe(1);
    expect(isLoggedIn()).toBe(true);
    expect(getAccessToken()).toBe("old-acc");
    expect(sessionStorage.getItem("refresh_token")).toBe("old-ref");
  });

  it("ignores a response that arrives after the timeout", async () => {
    const late = deferred<Response>();
    vi.spyOn(global, "fetch").mockImplementation((input) =>
      // Ignores the abort signal, like a response already on its way.
      String(input).endsWith("/auth/refresh") ? late.promise : Promise.resolve(unauthorized())
    );
    tokens.saveTokens({ access_token: "old-acc", refresh_token: "old-ref" });

    const request = api.get("/climber/me", true).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(REFRESH_TIMEOUT_MS);
    await expect(request).resolves.toMatchObject({ message: REFRESH_TIMEOUT_MESSAGE });

    late.resolve(pair("late-acc", "late-ref"));
    await vi.advanceTimersByTimeAsync(0);

    expect(getAccessToken()).toBe("old-acc");
    expect(sessionStorage.getItem("refresh_token")).toBe("old-ref");
  });

  it("does not log out when a 401 from refresh arrives after the timeout", async () => {
    const late = deferred<Response>();
    vi.spyOn(global, "fetch").mockImplementation((input) =>
      String(input).endsWith("/auth/refresh") ? late.promise : Promise.resolve(unauthorized())
    );
    tokens.saveTokens({ access_token: "old-acc", refresh_token: "old-ref" });

    const request = api.get("/climber/me", true).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(REFRESH_TIMEOUT_MS);
    await request;

    late.resolve(unauthorized());
    await vi.advanceTimersByTimeAsync(0);

    expect(isLoggedIn()).toBe(true);
    expect(getAccessToken()).toBe("old-acc");
  });
});
