import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCompetitions } from "@/services/api";
import { CompetitionResponse } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";

interface UseAllCompetitionsResult {
  competitions: CompetitionResponse[];
  /** True until the first response for this refreshKey arrives. */
  loading: boolean;
  /** True while any request is in flight, refetches included. */
  fetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const NO_COMPETITIONS: CompetitionResponse[] = [];

/** Every competition, without the signed-in climber's registration status (admin views). */
export function useAllCompetitions(refreshKey?: number): UseAllCompetitionsResult {
  const query = useQuery({
    queryKey: ["competitions", refreshKey],
    queryFn: async () => (await getCompetitions()) ?? NO_COMPETITIONS,
    // Competitions are edited from several admin views, so always refetch on
    // mount instead of trusting the global five-minute staleTime.
    staleTime: 0,
  });

  const { refetch } = query;
  const refetchCompetitions = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    competitions: query.data ?? NO_COMPETITIONS,
    loading: query.isPending,
    fetching: query.isFetching,
    error: query.error ? getUserFriendlyError(query.error) : null,
    refetch: refetchCompetitions,
  };
}
