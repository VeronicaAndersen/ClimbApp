import { useQuery } from "@tanstack/react-query";
import { getCompetitions, getCompRegistrationInfo } from "@/services/api";
import type { CompetitionResponse } from "@/types";

interface UseActiveCompetitionResult {
  /** Today's or the nearest upcoming competition the climber is approved for. */
  activeCompetition: CompetitionResponse | null;
  loading: boolean;
  failed: boolean;
}

/** Midnight (local time) of the given date, as a timestamp. */
function dayOf(date: Date | string): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** A failed lookup (404 when not registered) counts as not approved. */
async function isApproved(competitionId: number): Promise<boolean> {
  const registration = await getCompRegistrationInfo(competitionId).catch(() => null);
  return !!registration?.approved;
}

async function fetchActiveCompetition(): Promise<CompetitionResponse | null> {
  const competitions = (await getCompetitions()) ?? [];
  const approved = await Promise.all(competitions.map((c) => isApproved(c.id)));

  const today = dayOf(new Date());
  // Earliest date first, so a competition held today wins over later ones.
  const upcoming = competitions
    .filter((c, i) => approved[i] && dayOf(c.comp_date) >= today)
    .sort((a, b) => dayOf(a.comp_date) - dayOf(b.comp_date));

  return upcoming[0] ?? null;
}

export function useActiveCompetition(): UseActiveCompetitionResult {
  const query = useQuery({
    // Per-user data: storeTokens resets every query on an account change.
    queryKey: ["activeCompetition"],
    queryFn: fetchActiveCompetition,
    // Approval happens on the competition day, so always refetch on mount
    // instead of trusting the global five-minute staleTime.
    staleTime: 0,
    // Never swap or hide the competition behind an editor with unsaved scores.
    refetchOnReconnect: false,
  });

  return {
    activeCompetition: query.data ?? null,
    loading: query.isPending,
    // Only a failed first load is an error; a failed refetch keeps the cached competition.
    failed: query.isLoadingError,
  };
}
