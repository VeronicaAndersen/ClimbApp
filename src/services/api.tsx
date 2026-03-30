import { api, tokens, clearCache } from "@/lib/apiClient";
import {
  LoginRequest,
  LoginResponse,
  RegistrationRequest,
  SignupResponse,
  CompetitionRequest,
  UrlParams,
  ScoreRequest,
  ScoreBatch,
  SeasonRequest,
  SeasonResponse,
  MyInfoResponse,
  RegisterToCompResponse,
  RegistrationWithClimber,
  RegistrationApprovalUpdate,
  RegistrationLevelUpdate,
  ProblemScoreBulkResult,
  ScoreBatchResponse,
  CompetitionResponse,
  ClimberResponse,
  ClimberUpdateRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  LeaderboardResponse,
} from "@/types";

// Auth
export async function loginClimber(payload: LoginRequest): Promise<LoginResponse | null> {
  // Clear cache when logging in to ensure fresh data for the new user
  clearCache();
  const data = await api.post<LoginResponse, LoginRequest>("/auth/login", payload);
  tokens.saveTokens(data);
  return data;
}

export async function signupClimber(payload: RegistrationRequest): Promise<SignupResponse | null> {
  clearCache();
  const data = await api.post<SignupResponse, RegistrationRequest>("/auth/signup", payload);
  tokens.saveTokens(data);
  return data;
}

// Climber
export const getMyInfo = () => api.get<MyInfoResponse>("/climber/me", true);

export const updateMyInfo = (payload: ClimberUpdateRequest) =>
  api.patch<MyInfoResponse, ClimberUpdateRequest>("/climber/me", payload, true);

export const getClimberById = (id: number) => api.get<ClimberResponse>(`/climber/${id}`);

export const getAllClimbers = () => api.get<ClimberResponse[]>("/climber", true);

export const updateClimberById = (climberId: number, payload: ClimberUpdateRequest) =>
  api.patch(`/climber/${climberId}`, payload, true);

export const deleteClimberById = (climberId: number) => api.delete(`/climber/${climberId}`, true);

export const registerClimber = (payload: RegistrationRequest) => api.post("/climber", payload);

// Competition
export const createCompetition = (payload: CompetitionRequest) =>
  api.post("/competition", payload, true);

export const getCompetitions = (name?: string) => {
  const url = name ? `/competition?name=${encodeURIComponent(name)}` : "/competition";
  return api.get<CompetitionResponse[]>(url);
};

export const updateCompetitionById = (competitionId: number, payload: CompetitionRequest) =>
  api.patch(`/competition/${competitionId}`, payload, true);

export const deleteCompetitionById = (competitionId: number) =>
  api.delete(`/competition/${competitionId}`, true);

export const getCompRegistrationInfo = (competitionId: number) =>
  api.get<RegisterToCompResponse>(`/competition/${competitionId}/registration`, true);

export const checkRegistration = (competitionId: number) =>
  api.get<boolean>(`/competition/${competitionId}/registration/check`, true);

export const registerClimberToCompetition = (competitionId: number, level: number) =>
  api.post(`/competition/${competitionId}/register`, { level }, true);

export const getAllRegistrations = (competitionId: number) =>
  api.get<RegistrationWithClimber[]>(
    `/competition/${competitionId}/registrations`,
    true,
    true // skipCache - always fetch fresh data
  );

export const updateRegistrationApproval = (
  competitionId: number,
  userId: number,
  approved: boolean
) =>
  api.patch<RegisterToCompResponse, RegistrationApprovalUpdate>(
    `/competition/${competitionId}/registration/${userId}`,
    { approved },
    true
  );

export const updateRegistrationLevel = (competitionId: number, userId: number, level: number) =>
  api.patch<RegisterToCompResponse, RegistrationLevelUpdate>(
    `/competition/${competitionId}/registration/${userId}/level`,
    { level },
    true
  );

// Seasons
export const createSeason = (payload: SeasonRequest) => api.post("/season", payload, true);

export const getSeasons = () => api.get<SeasonResponse[]>(`/season`, true);

export const getSeasonById = (seasonId: number) =>
  api.get<SeasonResponse>(`/season/${seasonId}`, true);

export const updateSeasonById = (seasonId: number, payload: SeasonRequest) =>
  api.patch(`/season/${seasonId}`, payload, true);

export const deleteSeasonById = (seasonId: number) => api.delete(`/season/${seasonId}`, true);

// Scores
export const getScoresBatch = ({ comp_id, level }: UrlParams) =>
  api.get<ScoreBatchResponse[]>(`/competitions/${comp_id}/level/${level}/scores/batch`, true);

export const updateScore = ({ comp_id, level, problem_no }: UrlParams, payload: ScoreRequest) =>
  api.put(`/competitions/${comp_id}/level/${level}/problems/${problem_no}/score`, payload, true);

export const updateScoreBatch = ({ comp_id, level }: UrlParams, payload: ScoreBatch) =>
  api.put<ProblemScoreBulkResult[], ScoreBatch>(
    `/competitions/${comp_id}/level/${level}/scores/batch`,
    payload,
    true
  );

// Leaderboard
export const getLeaderboard = (comp_id: number) =>
  api.get<LeaderboardResponse>(`/competition/${comp_id}/leaderboard`, true, true);

// Password Reset
export const requestPasswordReset = (payload: PasswordResetRequest) =>
  api.post<{ message: string }, PasswordResetRequest>("/auth/password-reset/request", payload);

export const confirmPasswordReset = (payload: PasswordResetConfirm) =>
  api.post<{ message: string }, PasswordResetConfirm>("/auth/password-reset/confirm", payload);
