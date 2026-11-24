import { useQuery } from "@tanstack/react-query";
import { getLevelStats } from "@/services/api";
import type { LevelStatsResponse } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";

interface UseLevelStatsResult {
  stats: LevelStatsResponse | null;
  loading: boolean;
  error: string | null;
}

/** Per-problem statistics for one level of a competition (admin view). */
export function useLevelStats(compId: number, level: number): UseLevelStatsResult {
  const query = useQuery({
    queryKey: ["levelStats", compId, level],
    queryFn: async () => (await getLevelStats({ comp_id: compId, level })) ?? null,
    // Scores change while a competition runs, so refetch on every mount.
    staleTime: 0,
  });

  return {
    stats: query.data ?? null,
    loading: query.isPending,
    error: query.error ? getUserFriendlyError(query.error) : null,
  };
}
