import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isToday, isAdmin, canEditCompetition, normalizeScorePayload } from "../competitionUtils";

const TODAY = "2026-04-04";

describe("isToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TODAY));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for today's date", () => {
    expect(isToday(TODAY)).toBe(true);
  });

  it("returns false for yesterday", () => {
    expect(isToday("2026-04-03")).toBe(false);
  });

  it("returns false for tomorrow", () => {
    expect(isToday("2026-04-05")).toBe(false);
  });

  it("returns false for a date far in the past", () => {
    expect(isToday("2020-01-01")).toBe(false);
  });

  it("returns false for a date far in the future", () => {
    expect(isToday("2030-12-31")).toBe(false);
  });
});

describe("isAdmin", () => {
  it("returns true for admin scope", () => {
    expect(isAdmin("admin")).toBe(true);
  });

  it("returns true for superadmin scope", () => {
    expect(isAdmin("superadmin")).toBe(true);
  });

  it("returns false for climber scope", () => {
    expect(isAdmin("climber")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isAdmin("")).toBe(false);
  });

  it("returns false for setter scope", () => {
    expect(isAdmin("setter")).toBe(false);
  });
});

describe("canEditCompetition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TODAY));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows editing on competition day for any user", () => {
    expect(canEditCompetition(TODAY, "climber")).toBe(true);
  });

  it("denies editing on future competition day for regular user", () => {
    expect(canEditCompetition("2026-04-05", "climber")).toBe(false);
  });

  it("denies editing on past competition day for regular user", () => {
    expect(canEditCompetition("2026-04-03", "climber")).toBe(false);
  });

  it("allows editing with admin override on a future date", () => {
    expect(canEditCompetition("2026-04-05", "admin", true)).toBe(true);
  });

  it("allows editing with admin override on a past date", () => {
    expect(canEditCompetition("2026-04-03", "admin", true)).toBe(true);
  });

  it("denies admin editing without override on a different day", () => {
    expect(canEditCompetition("2026-04-05", "admin", false)).toBe(false);
  });

  it("allows superadmin editing with override", () => {
    expect(canEditCompetition("2026-04-05", "superadmin", true)).toBe(true);
  });
});

describe("normalizeScorePayload", () => {
  it("sets got_bonus to true when attempts_to_bonus > 0", () => {
    const result = normalizeScorePayload({ attempts_total: 3, attempts_to_bonus: 2, attempts_to_top: 0 });
    expect(result.got_bonus).toBe(true);
  });

  it("sets got_bonus to false when attempts_to_bonus is 0", () => {
    const result = normalizeScorePayload({ attempts_total: 3, attempts_to_bonus: 0, attempts_to_top: 0 });
    expect(result.got_bonus).toBe(false);
  });

  it("sets got_top to true when attempts_to_top > 0", () => {
    const result = normalizeScorePayload({ attempts_total: 3, attempts_to_bonus: 1, attempts_to_top: 2 });
    expect(result.got_top).toBe(true);
  });

  it("sets got_top to false when attempts_to_top is 0", () => {
    const result = normalizeScorePayload({ attempts_total: 3, attempts_to_bonus: 0, attempts_to_top: 0 });
    expect(result.got_top).toBe(false);
  });

  it("preserves all attempt counts", () => {
    const result = normalizeScorePayload({ attempts_total: 5, attempts_to_bonus: 2, attempts_to_top: 4 });
    expect(result.attempts_total).toBe(5);
    expect(result.attempts_to_bonus).toBe(2);
    expect(result.attempts_to_top).toBe(4);
  });

  it("handles zero attempts correctly", () => {
    const result = normalizeScorePayload({ attempts_total: 0, attempts_to_bonus: 0, attempts_to_top: 0 });
    expect(result).toEqual({
      attempts_total: 0,
      got_bonus: false,
      got_top: false,
      attempts_to_bonus: 0,
      attempts_to_top: 0,
    });
  });
});
