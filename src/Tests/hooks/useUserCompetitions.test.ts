import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import type { CompetitionResponse, ScoreBatchResponse } from "@/types";
import { useUserCompetitions } from "@/hooks/useUserCompetitions";
import { renderHookWithQueryClient } from "../utils/renderWithQueryClient";

const { getCompetitionsMock, getCompRegistrationInfoMock, getScoresBatchMock } = vi.hoisted(() => ({
  getCompetitionsMock: vi.fn(),
  getCompRegistrationInfoMock: vi.fn(),
  getScoresBatchMock: vi.fn(),
}));
vi.mock("@/services/api", () => ({
  getCompetitions: getCompetitionsMock,
  getCompRegistrationInfo: getCompRegistrationInfoMock,
  getScoresBatch: getScoresBatchMock,
}));

const competition = (id: number, comp_date: string): CompetitionResponse => ({
  id,
  name: `Cup ${id}`,
  description: "",
  comp_type: "qualifier",
  comp_date,
  season_id: 1,
  round_no: null,
});

const score = (problem_no: number, attempts_total: number, top: number, bonus: number) =>
  ({
    problem_no,
    score: {
      attempts_total,
      got_top: top > 0,
      got_bonus: bonus > 0,
      attempts_to_top: top,
      attempts_to_bonus: bonus,
    },
  }) satisfies ScoreBatchResponse;

beforeEach(() => {
  getCompetitionsMock.mockReset();
  getCompRegistrationInfoMock.mockReset();
  getScoresBatchMock.mockReset();
});

describe("useUserCompetitions", () => {
  it("returns registered competitions with scores, newest first, with a summary", async () => {
    getCompetitionsMock.mockResolvedValue([
      competition(1, "2026-01-10"),
      competition(2, "2026-03-10"),
      competition(3, "2026-02-10"),
    ]);
    // Competition 3 is not registered (the API answers 404).
    getCompRegistrationInfoMock.mockImplementation(async (id: number) => {
      if (id === 3) throw new Error("Not found");
      return { comp_id: id, user_id: 7, level: 2, approved: true, created_at: "2026-01-01" };
    });
    getScoresBatchMock.mockResolvedValue([score(1, 3, 3, 1), score(2, 0, 0, 0)]);

    const { result } = renderHookWithQueryClient(() => useUserCompetitions());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.competitions).toEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.competitions.map((c) => c.competition.id)).toEqual([2, 1]);
    expect(result.current.competitions[0]).toMatchObject({
      level: 2,
      summary: {
        totalProblems: 2,
        problemsWithTop: 1,
        problemsWithBonus: 1,
        totalAttempts: 3,
        averageAttempts: "3.0",
      },
    });
    expect(getScoresBatchMock).toHaveBeenCalledWith({ comp_id: 2, level: 2 });
  });

  it("leaves out future competitions but keeps today's", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 3, 4, 12)); // 2026-04-04 local noon
    try {
      getCompetitionsMock.mockResolvedValue([
        competition(1, "2026-04-03"),
        competition(2, "2026-04-04"),
        competition(3, "2026-04-05"),
      ]);
      getCompRegistrationInfoMock.mockResolvedValue({ level: 1 });
      getScoresBatchMock.mockResolvedValue([score(1, 1, 1, 1)]);

      const { result } = renderHookWithQueryClient(() => useUserCompetitions());

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.competitions.map((c) => c.competition.id)).toEqual([2, 1]);
      expect(getCompRegistrationInfoMock).not.toHaveBeenCalledWith(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides a competition whose scores fail to load", async () => {
    getCompetitionsMock.mockResolvedValue([competition(1, "2026-01-10")]);
    getCompRegistrationInfoMock.mockResolvedValue({ level: 1 });
    getScoresBatchMock.mockRejectedValue(new Error("Failed to fetch"));

    const { result } = renderHookWithQueryClient(() => useUserCompetitions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.competitions).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("returns a user-friendly error when the competitions request fails", async () => {
    getCompetitionsMock.mockRejectedValue(new Error("Failed to fetch"));

    const { result } = renderHookWithQueryClient(() => useUserCompetitions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(
      "Kunde inte ansluta till servern. Kontrollera din internetanslutning."
    );
    expect(result.current.competitions).toEqual([]);
  });
});
