import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import type { CompetitionResponse, RegistrationWithCompetition, ScoreBatchResponse } from "@/types";
import { useUserCompetitions } from "@/hooks/useUserCompetitions";
import { renderHookWithQueryClient } from "../utils/renderWithQueryClient";

const { getCompetitionsMock, getMyRegistrationsMock, getScoresBatchMock } = vi.hoisted(() => ({
  getCompetitionsMock: vi.fn(),
  getMyRegistrationsMock: vi.fn(),
  getScoresBatchMock: vi.fn(),
}));
vi.mock("@/services/api", () => ({
  getCompetitions: getCompetitionsMock,
  getMyRegistrations: getMyRegistrationsMock,
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

const registration = (
  comp_id: number,
  level: number,
  comp_date = "2026-01-10"
): RegistrationWithCompetition => ({
  comp_id,
  competition_name: `Cup ${comp_id}`,
  comp_date,
  level,
  approved: true,
  created_at: "2026-01-01T10:00:00Z",
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
  getMyRegistrationsMock.mockReset();
  getMyRegistrationsMock.mockResolvedValue([]);
  getScoresBatchMock.mockReset();
});

describe("useUserCompetitions", () => {
  it("returns registered competitions with scores, newest first, with a summary", async () => {
    getCompetitionsMock.mockResolvedValue([
      competition(1, "2026-01-10"),
      competition(2, "2026-03-10"),
      competition(3, "2026-02-10"),
    ]);
    // Competition 3 is not registered.
    getMyRegistrationsMock.mockResolvedValue([registration(2, 2), registration(1, 2)]);
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
    expect(getScoresBatchMock).toHaveBeenCalledTimes(2);
    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(1);
  });

  it("asks for scores at the level the user registered for", async () => {
    getCompetitionsMock.mockResolvedValue([competition(1, "2026-01-10")]);
    getMyRegistrationsMock.mockResolvedValue([registration(1, 4)]);
    getScoresBatchMock.mockResolvedValue([score(1, 1, 1, 1)]);

    const { result } = renderHookWithQueryClient(() => useUserCompetitions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.competitions[0].level).toBe(4);
    expect(getScoresBatchMock).toHaveBeenCalledWith({ comp_id: 1, level: 4 });
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
      getMyRegistrationsMock.mockResolvedValue([
        registration(1, 1, "2026-04-03"),
        registration(2, 1, "2026-04-04"),
        registration(3, 1, "2026-04-05"),
      ]);
      getScoresBatchMock.mockResolvedValue([score(1, 1, 1, 1)]);

      const { result } = renderHookWithQueryClient(() => useUserCompetitions());

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.competitions.map((c) => c.competition.id)).toEqual([2, 1]);
      expect(getScoresBatchMock).not.toHaveBeenCalledWith(expect.objectContaining({ comp_id: 3 }));
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides a competition whose scores fail to load", async () => {
    getCompetitionsMock.mockResolvedValue([
      competition(1, "2026-01-10"),
      competition(2, "2026-02-10"),
    ]);
    getMyRegistrationsMock.mockResolvedValue([registration(1, 1), registration(2, 1)]);
    getScoresBatchMock.mockImplementation(async ({ comp_id }: { comp_id: number }) => {
      if (comp_id === 1) throw new Error("Failed to fetch");
      return [score(1, 1, 1, 1)];
    });

    const { result } = renderHookWithQueryClient(() => useUserCompetitions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.competitions.map((c) => c.competition.id)).toEqual([2]);
    expect(result.current.error).toBeNull();
  });

  it("returns an error when the registrations request fails", async () => {
    getCompetitionsMock.mockResolvedValue([competition(1, "2026-01-10")]);
    getMyRegistrationsMock.mockRejectedValue(new Error("Failed to fetch"));

    const { result } = renderHookWithQueryClient(() => useUserCompetitions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(
      "Kunde inte ansluta till servern. Kontrollera din internetanslutning."
    );
    expect(getScoresBatchMock).not.toHaveBeenCalled();
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
