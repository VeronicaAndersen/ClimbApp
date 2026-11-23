import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { CompetitionResponse } from "@/types";
import { useAllCompetitions } from "@/hooks/useAllCompetitions";
import { renderHookWithQueryClient } from "../utils/renderWithQueryClient";

const { getCompetitionsMock } = vi.hoisted(() => ({ getCompetitionsMock: vi.fn() }));
vi.mock("@/services/api", () => ({ getCompetitions: getCompetitionsMock }));

const competition = {
  id: 1,
  name: "Deltävling 1",
  comp_date: "2026-03-01",
} as CompetitionResponse;

beforeEach(() => {
  getCompetitionsMock.mockReset();
});

describe("useAllCompetitions", () => {
  it("starts loading and then returns the competitions", async () => {
    getCompetitionsMock.mockResolvedValue([competition]);
    const { result } = renderHookWithQueryClient(() => useAllCompetitions());

    expect(result.current.loading).toBe(true);
    expect(result.current.competitions).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.competitions).toEqual([competition]);
    expect(result.current.error).toBeNull();
  });

  it("treats a null response as no competitions", async () => {
    getCompetitionsMock.mockResolvedValue(null);
    const { result } = renderHookWithQueryClient(() => useAllCompetitions());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.competitions).toEqual([]);
  });

  it("returns a user-friendly error when the request fails", async () => {
    getCompetitionsMock.mockRejectedValue(new Error("Failed to fetch"));
    const { result } = renderHookWithQueryClient(() => useAllCompetitions());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(
      "Kunde inte ansluta till servern. Kontrollera din internetanslutning."
    );
    expect(result.current.competitions).toEqual([]);
  });

  it("refetches when refetch is called", async () => {
    getCompetitionsMock.mockResolvedValue([]);
    const { result } = renderHookWithQueryClient(() => useAllCompetitions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    getCompetitionsMock.mockResolvedValue([competition]);
    await act(() => result.current.refetch());

    await waitFor(() => expect(result.current.competitions).toEqual([competition]));
  });

  it("refetches when refreshKey changes", async () => {
    getCompetitionsMock.mockResolvedValue([]);
    const { result, rerender } = renderHookWithQueryClient(
      ({ refreshKey }: { refreshKey: number }) => useAllCompetitions(refreshKey),
      { initialProps: { refreshKey: 0 } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    getCompetitionsMock.mockResolvedValue([competition]);
    rerender({ refreshKey: 1 });

    await waitFor(() => expect(result.current.competitions).toEqual([competition]));
    expect(getCompetitionsMock).toHaveBeenCalledTimes(2);
  });
});
