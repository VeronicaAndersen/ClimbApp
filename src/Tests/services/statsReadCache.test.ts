/**
 * Admin stats change while a competition runs, as climbers save scores on
 * their own devices. The hooks refetch on every mount, but the API client's
 * five-minute GET cache answered first, so admins saw old numbers. Goes
 * through the real API client to check each read reaches the server.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache, clearTokens, tokens } from "@/lib/apiClient";
import { getLevelStats, getUserScoresBatch } from "@/services/api";

const params = { comp_id: 12, level: 3 };

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

beforeEach(() => {
  clearTokens();
  clearCache();
  tokens.saveTokens({ access_token: "admin-access", refresh_token: "admin-refresh" });
});

afterEach(() => {
  vi.restoreAllMocks();
  clearTokens();
});

describe("admin stats reads", () => {
  it("fetch level stats from the server every time", async () => {
    const stats = (tops: number) => ({
      level: 3,
      problems: [
        {
          problem_no: 1,
          total_competitors: 4,
          got_top_count: tops,
          got_bonus_count: tops,
          got_top_percentage: tops * 25,
          got_bonus_percentage: tops * 25,
        },
      ],
    });
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(json(stats(1)))
      .mockResolvedValueOnce(json(stats(2)));

    await getLevelStats(params);
    const after = await getLevelStats(params);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(after.problems[0].got_top_count).toBe(2);
  });

  it("fetch a climber's scores from the server every time", async () => {
    const scores = (attemptsTotal: number) => [
      {
        problem_no: 1,
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
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(json(scores(1)))
      .mockResolvedValueOnce(json(scores(3)));

    await getUserScoresBatch(params, 34);
    const after = await getUserScoresBatch(params, 34);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(after[0].score.attempts_total).toBe(3);
  });
});
