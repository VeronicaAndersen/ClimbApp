import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  clearTokens,
  getAccessToken,
  isLoggedIn,
  switchSession,
  clearCache,
  tokens,
  api,
} from "../apiClient";

// Reset all token/session state before each test
beforeEach(() => {
  clearTokens();
  clearCache();
  vi.restoreAllMocks();
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
    const spy = mockFetch(204, "");
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
