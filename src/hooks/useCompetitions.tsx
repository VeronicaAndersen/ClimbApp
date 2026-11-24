import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { CompetitionResponse } from "@/types";
import { useAllCompetitions } from "@/hooks/useAllCompetitions";
import {
  myRegistrationsKey,
  useMyRegistrations,
  type RegistrationsByCompetition,
} from "@/hooks/useMyRegistrations";

interface UseCompetitionsResult {
  competitions: CompetitionResponse[];
  loading: boolean;
  error: string | null;
  /** Whether the climber is registered, for every listed competition. */
  registrationStatus: Record<number, boolean>;
  /** Level and approval of the climber's registrations, keyed by competition id. */
  registrations: RegistrationsByCompetition;
  checkingRegistration: Record<number, boolean>;
  /** Reloads the climber's registrations after registering or withdrawing. */
  refreshRegistrationStatus: (competitionId: number) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Competitions with the signed-in climber's registrations: two requests in
 * total, however many competitions there are. If the registrations fail to
 * load, every competition counts as "not registered" and `error` says so.
 */
export function useCompetitions(refreshKey?: number): UseCompetitionsResult {
  const queryClient = useQueryClient();
  const competitionsQuery = useAllCompetitions(refreshKey);
  const registrationsQuery = useMyRegistrations();
  const { competitions } = competitionsQuery;
  const { registrations } = registrationsQuery;

  const registrationStatus = useMemo(
    () => Object.fromEntries(competitions.map((comp) => [comp.id, comp.id in registrations])),
    [competitions, registrations]
  );

  const [checkingRegistration, setCheckingRegistration] = useState<Record<number, boolean>>({});

  const refreshRegistrationStatus = useCallback(
    async (competitionId: number) => {
      setCheckingRegistration((prev) => ({ ...prev, [competitionId]: true }));
      try {
        // Refetches the mounted query and waits for it; a failure lands in `error`.
        await queryClient.invalidateQueries({ queryKey: myRegistrationsKey });
      } finally {
        setCheckingRegistration((prev) => ({ ...prev, [competitionId]: false }));
      }
    },
    [queryClient]
  );

  const { refetch: refetchCompetitions } = competitionsQuery;
  const { refetch: refetchRegistrations } = registrationsQuery;
  const refetch = useCallback(async () => {
    await Promise.all([refetchCompetitions(), refetchRegistrations()]);
  }, [refetchCompetitions, refetchRegistrations]);

  return {
    competitions,
    loading: competitionsQuery.loading || registrationsQuery.loading,
    error: competitionsQuery.error ?? registrationsQuery.error,
    registrationStatus,
    registrations,
    checkingRegistration,
    refreshRegistrationStatus,
    refetch,
  };
}
