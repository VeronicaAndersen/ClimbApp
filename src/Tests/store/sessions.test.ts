import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTokens, initializeAuth } from "@/lib/apiClient";
import { useSessionsStore } from "@/store/sessions";

const alice = { id: 1, name: "Alice", accessToken: "A-acc", refreshToken: "A-ref" };
const bob = { id: 2, name: "Bob", accessToken: "B-acc", refreshToken: "B-ref" };

beforeEach(() => {
  clearTokens();
  useSessionsStore.getState().clearSessions();
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sessions store", () => {
  it("saves the rotated tokens of the account that was refreshed", async () => {
    const store = useSessionsStore.getState();
    store.addOrUpdateSession(alice);
    store.addOrUpdateSession(bob);
    store.setActiveId(alice.id);
    // Page reload: refresh token kept, access token gone, so startup refreshes.
    sessionStorage.setItem("refresh_token", alice.refreshToken);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access_token: "A-acc-2", refresh_token: "A-ref-2" }), {
        status: 200,
      })
    );

    await initializeAuth();

    expect(useSessionsStore.getState().sessions).toEqual([
      { ...alice, accessToken: "A-acc-2", refreshToken: "A-ref-2" },
      bob,
    ]);
  });

  it("keeps saved tokens out of localStorage", () => {
    useSessionsStore.getState().addOrUpdateSession(alice);

    expect(localStorage.getItem("climber-sessions")).toBeNull();
    expect(sessionStorage.getItem("climber-sessions")).toContain("A-ref");
  });
});
