import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { ScoreBatchResponse } from "@/types";
import { useScores } from "@/hooks/useScores";
import { renderHookWithQueryClient } from "../utils/renderWithQueryClient";

const { getMyInfoMock, getCompRegistrationInfoMock, getScoresBatchMock } = vi.hoisted(() => ({
  getMyInfoMock: vi.fn(),
  getCompRegistrationInfoMock: vi.fn(),
  getScoresBatchMock: vi.fn(),
}));
vi.mock("@/services/api", () => ({
  getMyInfo: getMyInfoMock,
  getCompRegistrationInfo: getCompRegistrationInfoMock,
  getScoresBatch: getScoresBatchMock,
}));

const problem = (problem_no: number, attempts_total = 0): ScoreBatchResponse => ({
  problem_no,
  score: {
    attempts_total,
    got_top: false,
    got_bonus: false,
    attempts_to_top: 0,
    attempts_to_bonus: 0,
  },
});

beforeEach(() => {
  getMyInfoMock.mockReset().mockResolvedValue({ id: 7 });
  getCompRegistrationInfoMock.mockReset().mockResolvedValue({ comp_id: 3, level: 2 });
  getScoresBatchMock.mockReset().mockResolvedValue([problem(1), problem(2)]);
});

describe("useScores", () => {
  it("starts loading and then returns climber, level and scores", async () => {
    const { result } = renderHookWithQueryClient(() => useScores(3));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.problems).toEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.climberId).toBe(7);
    expect(result.current.gradeLevel).toBe(2);
    expect(result.current.problems).toEqual([problem(1), problem(2)]);
    expect(result.current.initialProblems).toEqual([problem(1), problem(2)]);
    expect(result.current.error).toBeNull();
    expect(getScoresBatchMock).toHaveBeenCalledWith({ comp_id: 3, level: 2 });
  });

  it("keeps local edits separate from the initial scores", async () => {
    const { result } = renderHookWithQueryClient(() => useScores(3));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setProblems((prev) =>
        prev.map((p) =>
          p.problem_no === 1 ? { ...p, score: { ...p.score, attempts_total: 4 } } : p
        )
      );
    });

    expect(result.current.problems[0].score.attempts_total).toBe(4);
    expect(result.current.initialProblems[0].score.attempts_total).toBe(0);

    act(() => {
      result.current.setInitialProblems(result.current.problems);
    });
    expect(result.current.initialProblems[0].score.attempts_total).toBe(4);
  });

  it("reloads the scores when refreshTrigger changes", async () => {
    const { result, rerender } = renderHookWithQueryClient(
      ({ trigger }: { trigger: number }) => useScores(3, trigger),
      { initialProps: { trigger: 0 } }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.setProblems([]);
    });

    getScoresBatchMock.mockResolvedValue([problem(1, 5)]);
    rerender({ trigger: 1 });

    await waitFor(() => expect(result.current.problems).toEqual([problem(1, 5)]));
    expect(result.current.initialProblems).toEqual([problem(1, 5)]);
  });

  it("asks whether the user is registered when the registration is missing", async () => {
    getCompRegistrationInfoMock.mockResolvedValue(null);
    const { result } = renderHookWithQueryClient(() => useScores(3));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(
      "Kunde inte hämta användar- eller tävlingsdata. Har du anmält dig?"
    );
    expect(getScoresBatchMock).not.toHaveBeenCalled();
  });

  it("returns a user-friendly error when a request fails", async () => {
    getScoresBatchMock.mockRejectedValue(new Error("Failed to fetch"));
    const { result } = renderHookWithQueryClient(() => useScores(3));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(
      "Kunde inte ansluta till servern. Kontrollera din internetanslutning."
    );
    expect(result.current.problems).toEqual([]);
  });
});
