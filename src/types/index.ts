// Auth
export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

/** Same shape as LoginRequest — kept as alias for clarity at call sites */
export type SignupRequest = LoginRequest;

export type SignupResponse = LoginResponse & {
  climber: {
    id: number;
    name: string;
    user_scope: string;
    created_at: string;
  };
};

// Password Reset
export type PasswordResetRequest = {
  email: string;
};

export type PasswordResetConfirm = {
  token: string;
  new_password: string;
};

// Climber
export type RegistrationRequest = {
  username: string;
  password: string;
  email: string;
  firstname: string;
  lastname: string;
  club?: string;
};

export type ClimberResponse = {
  id: number;
  username: string;
  user_scope: string;
  created_at: string;
  email: string;
  firstname: string;
  lastname: string;
  club: string;
};

/** Alias — /climber/me returns the same shape as ClimberResponse */
export type MyInfoResponse = ClimberResponse;

export type ClimberUpdateRequest = {
  username?: string;
  password?: string;
  user_scope?: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  club?: string;
};

// Competition
export type CompetitionRequest = {
  name: string;
  description: string;
  comp_type: string;
  comp_date: string;
  season_id: number;
  round_no: number | null;
};

export type CompetitionResponse = {
  id: number;
  name: string;
  description: string;
  comp_type: string;
  comp_date: string;
  season_id: number;
  round_no: number | null;
};

// Season
export type SeasonRequest = {
  name?: string;
  year?: number;
};

export type SeasonResponse = {
  id: number;
  name: string;
  year: number;
  created_at: string;
};

// Registration
export type RegisterToComp = {
  level: number;
};

export type RegisterToCompResponse = {
  comp_id: number;
  user_id: number;
  level: number;
  approved: boolean;
  created_at: string;
};

export type RegistrationWithClimber = {
  comp_id: number;
  user_id: number;
  level: number;
  approved: boolean;
  created_at: string;
  climber_name: string;
};

export type RegistrationApprovalUpdate = {
  approved: boolean;
};

export type RegistrationLevelUpdate = {
  level: number;
};

// Score — shared shape used across request, response and batch types
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

// Leaderboard
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

// Season standings
export type SeasonStandingsEntry = {
  rank: number;
  name: string;
  total_score: number;
};

export type LevelStandings = {
  level: number;
  entries: SeasonStandingsEntry[];
};

export type SeasonStandingsResponse = {
  season_id: number;
  season_name: string;
  levels: LevelStandings[];
};

// Misc
export type CompetitionProps = {
  competition_id: number;
};

export type Grade = {
  level: number;
};

export type UrlParams = {
  id?: number;
  comp_id?: number;
  level?: number;
  problem_no?: number;
};

export type MessageProps = {
  message: string;
  color:
    | "ruby"
    | "gray"
    | "gold"
    | "bronze"
    | "brown"
    | "yellow"
    | "amber"
    | "orange"
    | "tomato"
    | "red"
    | "crimson"
    | "pink"
    | "plum"
    | "purple"
    | "violet"
    | "iris"
    | "indigo"
    | "blue"
    | "sky"
    | "green";
};
