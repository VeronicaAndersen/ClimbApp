import type { ScoreBatchResponse, ScoreData } from "@/types";

/** The score fields a climber edits on each problem card. */
export const SCORE_FIELDS = ["attempts_total", "attempts_to_bonus", "attempts_to_top"] as const;
export type ScoreField = (typeof SCORE_FIELDS)[number];

export const SCORE_FIELD_LABELS: Record<ScoreField, string> = {
  attempts_total: "Antal försök",
  attempts_to_bonus: "Bonus",
  attempts_to_top: "Topp",
};

export const MIN_SCORE_VALUE = 0;

/** Clamps a score input to a whole number of at least MIN_SCORE_VALUE. */
export function sanitizeScoreValue(value: number): number {
  if (Number.isNaN(value) || value < MIN_SCORE_VALUE) {
    return MIN_SCORE_VALUE;
  }
  return Math.floor(value);
}

/** Maps problem number to its last saved score. */
export function buildScoreMap(problems: ScoreBatchResponse[]): Map<number, ScoreData> {
  const map = new Map<number, ScoreData>();
  problems.forEach((problem) => {
    map.set(problem.problem_no, problem.score);
  });
  return map;
}

/** True when any edited field differs from the saved score (missing counts as 0). */
export function isScoreChanged(current: ScoreData, original: ScoreData | undefined): boolean {
  return SCORE_FIELDS.some((field) => {
    const currentValue = Number(current[field]) || 0;
    const originalValue = Number(original?.[field]) || 0;
    return currentValue !== originalValue;
  });
}
