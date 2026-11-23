import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSeasons } from "@/services/api";
import { SeasonResponse } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";

interface UseSeasonsResult {
  seasons: SeasonResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const NO_SEASONS: SeasonResponse[] = [];

export function useSeasons(refreshKey?: number): UseSeasonsResult {
  const query = useQuery({
    queryKey: ["seasons", refreshKey],
    queryFn: async () => (await getSeasons()) ?? NO_SEASONS,
    // Seasons are edited from several places, so always refetch on mount
    // instead of trusting the global five-minute staleTime.
    staleTime: 0,
  });

  const { refetch } = query;
  const refetchSeasons = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    seasons: query.data ?? NO_SEASONS,
    loading: query.isPending,
    error: query.error ? getUserFriendlyError(query.error) : null,
    refetch: refetchSeasons,
  };
}
