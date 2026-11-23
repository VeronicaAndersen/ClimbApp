import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { SeasonResponse } from "@/types";
import { useSeasons } from "@/hooks/useSeasons";
import { renderHookWithQueryClient } from "../utils/renderWithQueryClient";

const { getSeasonsMock } = vi.hoisted(() => ({ getSeasonsMock: vi.fn() }));
vi.mock("@/services/api", () => ({ getSeasons: getSeasonsMock }));

const season: SeasonResponse = { id: 1, name: "Vår", year: 2026, created_at: "2026-01-01" };

beforeEach(() => {
  getSeasonsMock.mockReset();
});

describe("useSeasons", () => {
  it("starts loading and then returns the seasons", async () => {
    getSeasonsMock.mockResolvedValue([season]);
    const { result } = renderHookWithQueryClient(() => useSeasons());

    expect(result.current.loading).toBe(true);
    expect(result.current.seasons).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.seasons).toEqual([season]);
    expect(result.current.error).toBeNull();
  });

  it("returns a user-friendly error when the request fails", async () => {
    getSeasonsMock.mockRejectedValue(new Error("Failed to fetch"));
    const { result } = renderHookWithQueryClient(() => useSeasons());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(
      "Kunde inte ansluta till servern. Kontrollera din internetanslutning."
    );
    expect(result.current.seasons).toEqual([]);
  });

  it("refetches when refetch is called", async () => {
    getSeasonsMock.mockResolvedValue([]);
    const { result } = renderHookWithQueryClient(() => useSeasons());
    await waitFor(() => expect(result.current.loading).toBe(false));

    getSeasonsMock.mockResolvedValue([season]);
    await act(() => result.current.refetch());

    await waitFor(() => expect(result.current.seasons).toEqual([season]));
  });

  it("refetches when refreshKey changes", async () => {
    getSeasonsMock.mockResolvedValue([]);
    const { result, rerender } = renderHookWithQueryClient(
      ({ refreshKey }: { refreshKey: number }) => useSeasons(refreshKey),
      { initialProps: { refreshKey: 0 } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    getSeasonsMock.mockResolvedValue([season]);
    rerender({ refreshKey: 1 });

    await waitFor(() => expect(result.current.seasons).toEqual([season]));
    expect(getSeasonsMock).toHaveBeenCalledTimes(2);
  });
});
