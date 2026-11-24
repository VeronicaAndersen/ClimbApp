import { useQuery } from "@tanstack/react-query";
import { getLeaderboard, getSeasonStandings } from "@/services/api";
import type { LevelLeaderboard } from "@/types";

export interface StandingsResult {
  /** Ranked entries per level; null until a selection has loaded. */
  levels: LevelLeaderboard[] | null;
  /** True while the first response for the selection is in flight. */
  loading: boolean;
  failed: boolean;
}

function useLevelStandings(
  scope: "leaderboard" | "seasonStandings",
  id: number | null,
  fetchStandings: (id: number) => Promise<{ levels: LevelLeaderboard[] } | null | undefined>
): StandingsResult {
  const query = useQuery({
    queryKey: [scope, id],
    queryFn: async () => (await fetchStandings(id as number))?.levels ?? null,
    enabled: id !== null,
    // Results change while a competition runs, so refetch on every selection;
    // a cached board stays visible until the fresh one arrives.
    staleTime: 0,
  });

  return {
    levels: query.data ?? null,
    loading: query.isLoading,
    failed: query.isError,
  };
}

/** Per-level ranking for one competition; idle while competitionId is null. */
export function useCompetitionLeaderboard(competitionId: number | null): StandingsResult {
  return useLevelStandings("leaderboard", competitionId, getLeaderboard);
}

/** Per-level season totals; idle while seasonId is null. */
export function useSeasonStandings(seasonId: number | null): StandingsResult {
  return useLevelStandings("seasonStandings", seasonId, getSeasonStandings);
}
