export type LeaderboardEntry = {
  rank: number;
  name: string;
  total_score: number;
};

export type LevelLeaderboard = {
  level: number;
  entries: LeaderboardEntry[];
};

export type LeaderboardResponse = {
  competition_id: number;
  levels: LevelLeaderboard[];
};

// Season standings — reuses LeaderboardEntry / LevelLeaderboard (identical shape)
export type SeasonStandingsResponse = {
  season_id: number;
  season_name: string;
  levels: LevelLeaderboard[];
};
