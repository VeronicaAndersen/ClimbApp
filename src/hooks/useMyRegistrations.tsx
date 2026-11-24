import { useCallback } from "react";
import { useQuery, type Query } from "@tanstack/react-query";
import { getMyRegistrations } from "@/services/api";
import type { RegistrationWithCompetition } from "@/types";
import { isToday } from "@/utils/competitionUtils";
import { getUserFriendlyError } from "@/utils/errorMessages";

/** How often pending registrations are re-checked on the competition day. */
export const APPROVAL_POLL_INTERVAL_MS = 30_000;

export const myRegistrationsKey = ["myRegistrations"] as const;

export type RegistrationsByCompetition = Record<number, RegistrationWithCompetition>;

export interface UseMyRegistrationsResult {
  /** The signed-in climber's registrations, keyed by competition id. */
  registrations: RegistrationsByCompetition;
  /** True until the first response arrives. */
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const NO_REGISTRATIONS: RegistrationsByCompetition = {};

type MyRegistrationsQuery = Query<RegistrationWithCompetition[] | null>;

/** Waiting for approval on the competition day, when the climber is at the gym. */
const hasPendingToday = (query: MyRegistrationsQuery) =>
  (query.state.data ?? []).some((reg) => !reg.approved && isToday(reg.comp_date));

const byCompetition = (
  registrations: RegistrationWithCompetition[] | null
): RegistrationsByCompetition =>
  Object.fromEntries((registrations ?? []).map((reg) => [reg.comp_id, reg]));

/**
 * The signed-in climber's registrations (level, approval) in one request.
 *
 * While any registration is pending on a competition held today, the list is
 * re-checked every APPROVAL_POLL_INTERVAL_MS and when the tab becomes visible;
 * React Query pauses the interval while the tab is hidden.
 */
export function useMyRegistrations(): UseMyRegistrationsResult {
  const query = useQuery({
    // Per-user data: storeTokens resets every query on an account change.
    queryKey: myRegistrationsKey,
    queryFn: getMyRegistrations,
    select: byCompetition,
    // Approval can change at any time, so refetch on every mount.
    staleTime: 0,
    refetchInterval: (q: MyRegistrationsQuery) =>
      hasPendingToday(q) ? APPROVAL_POLL_INTERVAL_MS : false,
    refetchOnWindowFocus: (q: MyRegistrationsQuery) =>
      hasPendingToday(q) ? ("always" as const) : false,
  });

  const { refetch } = query;
  const refetchRegistrations = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    registrations: query.data ?? NO_REGISTRATIONS,
    loading: query.isPending,
    error: query.error ? getUserFriendlyError(query.error) : null,
    refetch: refetchRegistrations,
  };
}
