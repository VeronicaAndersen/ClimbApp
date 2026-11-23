import { useState, type Dispatch, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyInfo, getCompRegistrationInfo, getScoresBatch } from "@/services/api";
import { ScoreBatchResponse } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";

interface UseScoresResult {
  climberId: number | null;
  gradeLevel: number | null;
  problems: ScoreBatchResponse[];
  initialProblems: ScoreBatchResponse[];
  setProblems: Dispatch<SetStateAction<ScoreBatchResponse[]>>;
  setInitialProblems: Dispatch<SetStateAction<ScoreBatchResponse[]>>;
  isLoading: boolean;
  error: string | null;
}

interface ScoresData {
  climberId: number;
  gradeLevel: number;
  scores: ScoreBatchResponse[];
}

const NOT_REGISTERED_MESSAGE = "Kunde inte hämta användar- eller tävlingsdata. Har du anmält dig?";

/** Copies so local edits never mutate the cached query data or each other. */
const copyScores = (scores: ScoreBatchResponse[]): ScoreBatchResponse[] =>
  scores.map((problem) => ({ ...problem, score: { ...problem.score } }));

/** The user's scores for the competition, or null if user or registration is missing. */
async function fetchScores(competitionId: number): Promise<ScoresData | null> {
  const [user, registration] = await Promise.all([
    getMyInfo(),
    getCompRegistrationInfo(competitionId),
  ]);
  if (!user || !registration) return null;

  const scores = await getScoresBatch({ comp_id: competitionId, level: registration.level });
  return { climberId: user.id, gradeLevel: registration.level, scores };
}

export function useScores(competitionId: number, refreshTrigger?: number): UseScoresResult {
  const query = useQuery({
    // Per-user data: storeTokens resets every query on an account change.
    queryKey: ["scores", competitionId, refreshTrigger],
    queryFn: () => fetchScores(competitionId),
    // Scores are edited on this screen, so always refetch on mount
    // instead of trusting the global five-minute staleTime.
    staleTime: 0,
  });
  const { data } = query;

  // Callers edit scores locally before saving, so they live in local state,
  // re-seeded whenever the query delivers new data. Structural sharing keeps
  // `data` stable across refetches with unchanged results, so a background
  // refetch does not wipe unsaved edits.
  const [problems, setProblems] = useState<ScoreBatchResponse[]>([]);
  const [initialProblems, setInitialProblems] = useState<ScoreBatchResponse[]>([]);
  const [seededFrom, setSeededFrom] = useState<ScoresData | null | undefined>(undefined);
  if (data !== seededFrom) {
    setSeededFrom(data);
    setProblems(copyScores(data?.scores ?? []));
    setInitialProblems(copyScores(data?.scores ?? []));
  }

  let error: string | null = null;
  if (query.error) error = getUserFriendlyError(query.error);
  else if (data === null) error = NOT_REGISTERED_MESSAGE;

  return {
    climberId: data?.climberId ?? null,
    gradeLevel: data?.gradeLevel ?? null,
    problems,
    initialProblems,
    setProblems,
    setInitialProblems,
    isLoading: query.isPending,
    error,
  };
}
