export type ScoreData = {
  attempts_total: number;
  got_bonus: boolean;
  got_top: boolean;
  attempts_to_bonus: number;
  attempts_to_top: number;
};

export type ScoreRequest = ScoreData;
export type ScoreResponse = ScoreData;

export type ScoreBatchResponse = {
  problem_no: number;
  score: ScoreData;
};

export type ScoreBatch = {
  items: ({ problem_no: number } & ScoreData)[];
};

export type ProblemScoreBulkResult = {
  problem_no: number;
  score: ScoreData;
};

/** A climber who reached top or bonus on a problem, as listed in level stats. */
export interface StatsClimber {
  id: number;
  username: string;
  firstname: string | null;
  lastname: string | null;
}

// In @/types
export interface ProblemStats {
  problem_no: number;
  total_competitors: number;
  got_top_count: number;
  got_bonus_count: number;
  got_top_percentage: number;
  got_bonus_percentage: number;
  /** Sorted by name server-side. */
  got_top_climbers: StatsClimber[];
  /** Sorted by name server-side. */
  got_bonus_climbers: StatsClimber[];
}

export interface LevelStatsResponse {
  level: number;
  problems: ProblemStats[];
}
