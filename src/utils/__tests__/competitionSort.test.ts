import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sortCompetitions } from "../competitionSort";
import type { CompetitionResponse } from "@/types";

const makeComp = (id: number, date: string): CompetitionResponse => ({
  id,
  name: `Competition ${id}`,
  description: "",
  comp_type: "QUALIFIER",
  comp_date: date,
  season_id: 1,
  round_no: null,
});

// Pin "today" to a known date for all tests
const TODAY = "2026-04-04";
const YESTERDAY = "2026-04-03";
const TOMORROW = "2026-04-05";

describe("sortCompetitions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TODAY));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty arrays for an empty input", () => {
    const { upcoming, past } = sortCompetitions([]);
    expect(upcoming).toHaveLength(0);
    expect(past).toHaveLength(0);
  });

  it("puts today's competition in upcoming", () => {
    const { upcoming, past } = sortCompetitions([makeComp(1, TODAY)]);
    expect(upcoming).toHaveLength(1);
    expect(past).toHaveLength(0);
  });

  it("puts future competition in upcoming", () => {
    const { upcoming, past } = sortCompetitions([makeComp(1, TOMORROW)]);
    expect(upcoming).toHaveLength(1);
    expect(past).toHaveLength(0);
  });

  it("puts past competition in past", () => {
    const { upcoming, past } = sortCompetitions([makeComp(1, YESTERDAY)]);
    expect(upcoming).toHaveLength(0);
    expect(past).toHaveLength(1);
  });

  it("sorts upcoming chronologically (soonest first)", () => {
    const comps = [makeComp(3, "2026-04-10"), makeComp(1, TOMORROW), makeComp(2, "2026-04-07")];
    const { upcoming } = sortCompetitions(comps);
    expect(upcoming.map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it("sorts past reverse-chronologically (most recent first)", () => {
    const comps = [makeComp(1, "2026-03-01"), makeComp(3, "2026-04-02"), makeComp(2, "2026-03-20")];
    const { past } = sortCompetitions(comps);
    expect(past.map((c) => c.id)).toEqual([3, 2, 1]);
  });

  it("correctly splits a mixed list", () => {
    const comps = [makeComp(1, YESTERDAY), makeComp(2, TODAY), makeComp(3, TOMORROW)];
    const { upcoming, past } = sortCompetitions(comps);
    expect(upcoming.map((c) => c.id)).toEqual([2, 3]);
    expect(past.map((c) => c.id)).toEqual([1]);
  });
});
