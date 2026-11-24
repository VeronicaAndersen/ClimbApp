import { useQuery } from "@tanstack/react-query";
import { getClimberRegistrations, getUserScoresBatch } from "@/services/api";
import type { RegistrationWithCompetition, ScoreBatchResponse } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";

const NO_REGISTRATIONS: RegistrationWithCompetition[] = [];
const NO_SCORES: ScoreBatchResponse[] = [];

interface QueryState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

/** A climber's registrations (admin view); idle while climberId is null. */
export function useClimberRegistrations(
  climberId: number | null
): QueryState<RegistrationWithCompetition[]> {
  const query = useQuery({
    queryKey: ["climberRegistrations", climberId],
    queryFn: async () => (await getClimberRegistrations(climberId as number)) ?? NO_REGISTRATIONS,
    enabled: climberId !== null,
    staleTime: 0,
  });

  return {
    data: query.data ?? NO_REGISTRATIONS,
    loading: query.isLoading,
    error: query.error ? getUserFriendlyError(query.error) : null,
  };
}

/** A climber's scores in one registration; idle until both are known. */
export function useClimberScores(
  climberId: number | null,
  registration: { comp_id: number; level: number } | null
): QueryState<ScoreBatchResponse[]> {
  const compId = registration?.comp_id ?? null;
  const level = registration?.level ?? null;
  const query = useQuery({
    queryKey: ["climberScores", climberId, compId, level],
    queryFn: async () =>
      (await getUserScoresBatch(
        { comp_id: compId as number, level: level as number },
        climberId as number
      )) ?? NO_SCORES,
    enabled: climberId !== null && compId !== null && level !== null,
    staleTime: 0,
  });

  return {
    data: query.data ?? NO_SCORES,
    loading: query.isLoading,
    error: query.error ? getUserFriendlyError(query.error) : null,
  };
}
