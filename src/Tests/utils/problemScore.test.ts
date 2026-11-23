import { describe, expect, it } from "vitest";
import { buildScoreMap, isScoreChanged, sanitizeScoreValue } from "@/utils/problemScore";

const score = {
  attempts_total: 2,
  got_bonus: true,
  got_top: false,
  attempts_to_bonus: 1,
  attempts_to_top: 0,
};

describe("sanitizeScoreValue", () => {
  it("clamps negatives and NaN to zero and floors decimals", () => {
    expect(sanitizeScoreValue(-1)).toBe(0);
    expect(sanitizeScoreValue(Number.NaN)).toBe(0);
    expect(sanitizeScoreValue(2.7)).toBe(2);
  });
});

describe("buildScoreMap", () => {
  it("maps problem number to score", () => {
    const map = buildScoreMap([{ problem_no: 4, score }]);
    expect(map.get(4)).toBe(score);
  });
});

describe("isScoreChanged", () => {
  it("is false for equal scores and true when an edited field differs", () => {
    expect(isScoreChanged(score, { ...score })).toBe(false);
    expect(isScoreChanged({ ...score, attempts_to_top: 1 }, score)).toBe(true);
  });

  it("ignores got_bonus and got_top", () => {
    expect(isScoreChanged({ ...score, got_top: true }, score)).toBe(false);
  });

  it("treats a missing original as all zeros", () => {
    expect(isScoreChanged({ ...score, attempts_total: 0, attempts_to_bonus: 0 }, undefined)).toBe(
      false
    );
    expect(isScoreChanged(score, undefined)).toBe(true);
  });
});
