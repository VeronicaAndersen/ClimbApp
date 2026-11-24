/**
 * A score saved on its own (PUT .../problems/{n}/score) did not clear the
 * cached GET .../scores/batch, so reopening the page within five minutes
 * showed the old score, and "save all" then wrote that old score back.
 * Goes through the real API client to check the list is read fresh.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache, clearTokens, tokens } from "@/lib/apiClient";
import { getScoresBatch, updateScore } from "@/services/api";

const params = { comp_id: 12, level: 3 };

function scoreList(attemptsTotal: number) {
  return [
    {
      problem_no: 2,
      score: {
        attempts_total: attemptsTotal,
        got_bonus: false,
        got_top: false,
        attempts_to_bonus: 0,
        attempts_to_top: 0,
        ifsc_score: 0,
      },
    },
  ];
}

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

beforeEach(() => {
  clearTokens();
  clearCache();
  tokens.saveTokens({ access_token: "climber-access", refresh_token: "climber-refresh" });
});

afterEach(() => {
  vi.restoreAllMocks();
  clearTokens();
});

describe("score list after a single-problem save", () => {
  it("is read from the server, not the client cache", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(json(scoreList(1)))
      .mockResolvedValueOnce(json({ problem_no: 2 }))
      .mockResolvedValueOnce(json(scoreList(5)));

    await getScoresBatch(params);
    await updateScore(
      { ...params, problem_no: 2 },
      {
        attempts_total: 5,
        got_bonus: false,
        got_top: false,
        attempts_to_bonus: 0,
        attempts_to_top: 0,
      }
    );
    const after = await getScoresBatch(params);

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(after[0].score.attempts_total).toBe(5);
  });
});
