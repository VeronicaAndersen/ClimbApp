import { useQueries, type Query } from "@tanstack/react-query";
import { getCompRegistrationInfo } from "@/services/api";
import type { CompetitionResponse, RegisterToCompResponse } from "@/types";
import { isToday } from "@/utils/competitionUtils";

/** How often a pending registration is re-checked on the competition day. */
export const APPROVAL_POLL_INTERVAL_MS = 30_000;

export const registrationDetailsKey = (competitionId: number) =>
  ["compRegistration", competitionId] as const;

/** Waiting for approval on the competition day, when the climber is at the gym. */
const isPendingToday = (comp: CompetitionResponse, details: RegisterToCompResponse | undefined) =>
  !!details && !details.approved && isToday(comp.comp_date);

/**
 * Registration details (level, approval) for the competitions the climber is
 * registered for, keyed by competition id. A failed lookup leaves that entry out.
 *
 * Pending registrations on the competition day are re-checked every
 * APPROVAL_POLL_INTERVAL_MS and when the tab becomes visible; React Query
 * pauses the interval while the tab is hidden.
 */
export function useRegistrationDetails(
  registered: CompetitionResponse[]
): Record<number, RegisterToCompResponse> {
  const results = useQueries({
    queries: registered.map((comp) => ({
      // Per-user data: storeTokens resets every query on an account change.
      queryKey: registrationDetailsKey(comp.id),
      queryFn: async () => (await getCompRegistrationInfo(comp.id)) ?? null,
      // Approval can change at any time, so refetch on every mount, as before.
      staleTime: 0,
      refetchInterval: (query: Query<RegisterToCompResponse | null>) =>
        isPendingToday(comp, query.state.data ?? undefined) ? APPROVAL_POLL_INTERVAL_MS : false,
      refetchOnWindowFocus: (query: Query<RegisterToCompResponse | null>) =>
        isPendingToday(comp, query.state.data ?? undefined) ? ("always" as const) : false,
    })),
  });

  const details: Record<number, RegisterToCompResponse> = {};
  results.forEach((result, i) => {
    if (result.data) details[registered[i].id] = result.data;
  });
  return details;
}
