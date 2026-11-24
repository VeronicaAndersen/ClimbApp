import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import type { RegistrationWithCompetition } from "@/types";
import { APPROVAL_POLL_INTERVAL_MS, useMyRegistrations } from "@/hooks/useMyRegistrations";
import { renderHookWithQueryClient } from "../utils/renderWithQueryClient";

const { getMyRegistrationsMock } = vi.hoisted(() => ({ getMyRegistrationsMock: vi.fn() }));
vi.mock("@/services/api", () => ({ getMyRegistrations: getMyRegistrationsMock }));

const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const registration = (
  comp_id: number,
  approved: boolean,
  comp_date = localDate(0)
): RegistrationWithCompetition => ({
  comp_id,
  competition_name: `Cup ${comp_id}`,
  comp_date,
  level: 2,
  approved,
  created_at: "2026-01-01T10:00:00Z",
});

/** Moves the fake clock, then gives React Query's own timers a tick to settle. */
async function advance(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
}

const becomeVisible = () =>
  // Browsers fire it on document and let it bubble to window.
  document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));

beforeEach(() => {
  vi.useFakeTimers();
  getMyRegistrationsMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useMyRegistrations", () => {
  it("returns the registrations keyed by competition id", async () => {
    getMyRegistrationsMock.mockResolvedValue([registration(4, true), registration(9, false)]);

    const { result } = renderHookWithQueryClient(() => useMyRegistrations());
    expect(result.current.loading).toBe(true);
    expect(result.current.registrations).toEqual({});

    await advance();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.registrations).toEqual({
      4: registration(4, true),
      9: registration(9, false),
    });
    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(1);
  });

  it("returns a user-friendly error when the request fails", async () => {
    getMyRegistrationsMock.mockRejectedValue(new Error("Failed to fetch"));

    const { result } = renderHookWithQueryClient(() => useMyRegistrations());
    await advance();

    expect(result.current.error).toBe(
      "Kunde inte ansluta till servern. Kontrollera din internetanslutning."
    );
    expect(result.current.registrations).toEqual({});
  });

  it("polls while a registration is pending today and stops once approved", async () => {
    getMyRegistrationsMock.mockResolvedValueOnce([
      registration(1, true, localDate(-7)),
      registration(2, false),
    ]);
    const { result } = renderHookWithQueryClient(() => useMyRegistrations());
    await advance();

    getMyRegistrationsMock.mockResolvedValue([
      registration(1, true, localDate(-7)),
      registration(2, true),
    ]);
    await advance(APPROVAL_POLL_INTERVAL_MS);

    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(2);
    expect(result.current.registrations[2].approved).toBe(true);

    // Approved: no more polling.
    await advance(APPROVAL_POLL_INTERVAL_MS * 2);
    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(2);
  });

  it("re-checks a pending registration today when the tab becomes visible", async () => {
    getMyRegistrationsMock.mockResolvedValueOnce([registration(2, false)]);
    const { result } = renderHookWithQueryClient(() => useMyRegistrations());
    await advance();

    getMyRegistrationsMock.mockResolvedValueOnce([registration(2, true)]);
    becomeVisible();
    await advance();

    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(2);
    expect(result.current.registrations[2].approved).toBe(true);
  });

  it("does not poll or re-check on focus when nothing is pending today", async () => {
    getMyRegistrationsMock.mockResolvedValue([
      registration(1, true),
      registration(2, false, localDate(3)),
      registration(3, false, localDate(-3)),
    ]);
    renderHookWithQueryClient(() => useMyRegistrations());
    await advance();

    await advance(APPROVAL_POLL_INTERVAL_MS * 2);
    becomeVisible();
    await advance();

    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(1);
  });
});
