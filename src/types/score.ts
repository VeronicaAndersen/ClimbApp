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

// In @/types
export interface ProblemStats {
  problem_no: number;
  total_competitors: number;
  got_top_count: number;
  got_bonus_count: number;
  got_top_percentage: number;
  got_bonus_percentage: number;
}

export interface LevelStatsResponse {
  level: number;
  problems: ProblemStats[];
}
