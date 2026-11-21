/**
 * GET /climber/{id} requires a login (admins see anyone, others only
 * themselves). Goes through the real API client to check that the access
 * token is actually sent; without it the Tombola page got 401s.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache, clearTokens, tokens } from "@/lib/apiClient";
import { getClimberById } from "@/services/api";

beforeEach(() => {
  clearTokens();
  clearCache();
});

afterEach(() => {
  vi.restoreAllMocks();
  clearTokens();
});

describe("getClimberById", () => {
  it("sends the access token", async () => {
    tokens.saveTokens({ access_token: "admin-access", refresh_token: "admin-refresh" });
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 5, username: "alice" }), { status: 200 })
      );

    await expect(getClimberById(5)).resolves.toMatchObject({ id: 5 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/climber\/5$/);
    expect(init?.headers).toMatchObject({ Authorization: "Bearer admin-access" });
  });
});
