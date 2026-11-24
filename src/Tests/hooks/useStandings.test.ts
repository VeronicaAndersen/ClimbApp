import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import type { LevelLeaderboard } from "@/types";
import { useCompetitionLeaderboard, useSeasonStandings } from "@/hooks/useStandings";
import { renderHookWithQueryClient } from "../utils/renderWithQueryClient";

const { getLeaderboardMock, getSeasonStandingsMock } = vi.hoisted(() => ({
  getLeaderboardMock: vi.fn(),
  getSeasonStandingsMock: vi.fn(),
}));
vi.mock("@/services/api", () => ({
  getLeaderboard: getLeaderboardMock,
  getSeasonStandings: getSeasonStandingsMock,
}));

const levels: LevelLeaderboard[] = [
  { level: 1, entries: [{ rank: 1, name: "Anna", total_score: 10 }] },
];

beforeEach(() => {
  getLeaderboardMock.mockReset();
  getSeasonStandingsMock.mockReset();
});

describe("useCompetitionLeaderboard", () => {
  it("stays idle while no competition is selected", () => {
    const { result } = renderHookWithQueryClient(() => useCompetitionLeaderboard(null));

    expect(result.current).toEqual({ levels: null, loading: false, failed: false });
    expect(getLeaderboardMock).not.toHaveBeenCalled();
  });

  it("returns the levels of the selected competition", async () => {
    getLeaderboardMock.mockResolvedValue({ competition_id: 7, levels });
    const { result } = renderHookWithQueryClient(() => useCompetitionLeaderboard(7));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.levels).toEqual(levels);
    expect(getLeaderboardMock).toHaveBeenCalledWith(7);
  });

  it("returns null levels when the API returns no body", async () => {
    getLeaderboardMock.mockResolvedValue(null);
    const { result } = renderHookWithQueryClient(() => useCompetitionLeaderboard(7));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toEqual({ levels: null, loading: false, failed: false });
  });

  it("reports a failed request", async () => {
    getLeaderboardMock.mockRejectedValue(new Error("boom"));
    const { result } = renderHookWithQueryClient(() => useCompetitionLeaderboard(7));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.levels).toBeNull();
  });
});

describe("useSeasonStandings", () => {
  it("returns the levels of the selected season", async () => {
    getSeasonStandingsMock.mockResolvedValue({ season_id: 3, season_name: "Vår", levels });
    const { result } = renderHookWithQueryClient(() => useSeasonStandings(3));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.levels).toEqual(levels);
    expect(getSeasonStandingsMock).toHaveBeenCalledWith(3);
  });
});
