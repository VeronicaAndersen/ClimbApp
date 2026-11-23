import { useQuery } from "@tanstack/react-query";
import { getCompetitions, getCompRegistrationInfo, getScoresBatch } from "@/services/api";
import { CompetitionResponse, ScoreBatchResponse } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";

export interface CompetitionWithScores {
  competition: CompetitionResponse;
  level: number;
  scores: ScoreBatchResponse[];
  summary: {
    totalProblems: number;
    problemsWithTop: number;
    problemsWithBonus: number;
    totalAttempts: number;
    averageAttempts: string;
  };
}

interface UseUserCompetitionsResult {
  competitions: CompetitionWithScores[];
  isLoading: boolean;
  error: string | null;
}

const NO_COMPETITIONS: CompetitionWithScores[] = [];

function summarize(scores: ScoreBatchResponse[]): CompetitionWithScores["summary"] {
  const { problemsWithTop, problemsWithBonus, totalAttempts, attemptedProblems } = scores.reduce(
    (acc, s) => ({
      problemsWithTop: acc.problemsWithTop + (s.score.attempts_to_top > 0 ? 1 : 0),
      problemsWithBonus: acc.problemsWithBonus + (s.score.attempts_to_bonus > 0 ? 1 : 0),
      totalAttempts: acc.totalAttempts + s.score.attempts_total,
      attemptedProblems: acc.attemptedProblems + (s.score.attempts_total > 0 ? 1 : 0),
    }),
    { problemsWithTop: 0, problemsWithBonus: 0, totalAttempts: 0, attemptedProblems: 0 }
  );
  return {
    totalProblems: scores.length,
    problemsWithTop,
    problemsWithBonus,
    totalAttempts,
    averageAttempts: attemptedProblems > 0 ? (totalAttempts / attemptedProblems).toFixed(1) : "0",
  };
}

/** One competition with the user's scores, or null if not registered or no scores. */
async function fetchCompetitionWithScores(
  comp: CompetitionResponse
): Promise<CompetitionWithScores | null> {
  // getCompRegistrationInfo throws 404 if not registered — catch means "not registered"
  const registration = await getCompRegistrationInfo(comp.id).catch(() => null);
  if (!registration?.level) return null;

  const scores = await getScoresBatch({ comp_id: comp.id, level: registration.level });
  if (scores.length === 0) return null;

  return { competition: comp, level: registration.level, scores, summary: summarize(scores) };
}

async function fetchUserCompetitions(): Promise<CompetitionWithScores[]> {
  const allCompetitions = await getCompetitions();
  if (!allCompetitions || allCompetitions.length === 0) return NO_COMPETITIONS;

  // A failure for one competition hides that competition, not the whole list.
  const results = await Promise.allSettled(allCompetitions.map(fetchCompetitionWithScores));

  return results
    .filter(
      (r): r is PromiseFulfilledResult<CompetitionWithScores> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value)
    .sort(
      (a, b) =>
        new Date(b.competition.comp_date).getTime() - new Date(a.competition.comp_date).getTime()
    );
}

export function useUserCompetitions(): UseUserCompetitionsResult {
  const query = useQuery({
    // Per-user data: storeTokens resets every query on an account change.
    queryKey: ["userCompetitions"],
    queryFn: fetchUserCompetitions,
    // Scores change while the user climbs, so always refetch on mount
    // instead of trusting the global five-minute staleTime.
    staleTime: 0,
  });

  return {
    competitions: query.data ?? NO_COMPETITIONS,
    isLoading: query.isPending,
    error: query.error ? getUserFriendlyError(query.error) : null,
  };
}
