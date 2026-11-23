import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { checkRegistration, getCompetitions } from "@/services/api";
import { CompetitionResponse } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";

interface UseCompetitionsResult {
  competitions: CompetitionResponse[];
  loading: boolean;
  error: string | null;
  registrationStatus: Record<number, boolean>;
  checkingRegistration: Record<number, boolean>;
  refreshRegistrationStatus: (competitionId: number) => Promise<void>;
  refetch: () => Promise<void>;
}

interface CompetitionsWithRegistration {
  competitions: CompetitionResponse[];
  registrationStatus: Record<number, boolean>;
}

const NO_COMPETITIONS: CompetitionResponse[] = [];
const NO_STATUS: Record<number, boolean> = {};

/** A failed check counts as "not registered", as the list offers to register then. */
async function isRegistered(competitionId: number): Promise<boolean> {
  try {
    return !!(await checkRegistration(competitionId));
  } catch (err) {
    console.error(`Error checking registration for competition ${competitionId}:`, err);
    return false;
  }
}

async function fetchCompetitionsWithRegistration(): Promise<CompetitionsWithRegistration> {
  const competitions = (await getCompetitions()) ?? NO_COMPETITIONS;
  const statuses = await Promise.all(competitions.map((comp) => isRegistered(comp.id)));
  const registrationStatus: Record<number, boolean> = {};
  competitions.forEach((comp, i) => {
    registrationStatus[comp.id] = statuses[i];
  });
  return { competitions, registrationStatus };
}

const competitionsKey = (refreshKey?: number) =>
  ["competitionsWithRegistration", refreshKey] as const;

export function useCompetitions(refreshKey?: number): UseCompetitionsResult {
  const queryClient = useQueryClient();
  // Per-user data: storeTokens resets every query on an account change.
  const query = useQuery({
    queryKey: competitionsKey(refreshKey),
    queryFn: fetchCompetitionsWithRegistration,
    // Registrations change from this list and from admins approving them,
    // so always refetch on mount instead of trusting the five-minute staleTime.
    staleTime: 0,
  });

  const [checkingRegistration, setCheckingRegistration] = useState<Record<number, boolean>>({});

  const refreshRegistrationStatus = useCallback(
    async (competitionId: number) => {
      setCheckingRegistration((prev) => ({ ...prev, [competitionId]: true }));
      const registered = await isRegistered(competitionId);
      queryClient.setQueryData<CompetitionsWithRegistration>(
        competitionsKey(refreshKey),
        (prev) =>
          prev && {
            ...prev,
            registrationStatus: { ...prev.registrationStatus, [competitionId]: registered },
          }
      );
      setCheckingRegistration((prev) => ({ ...prev, [competitionId]: false }));
    },
    [queryClient, refreshKey]
  );

  const { refetch } = query;
  const refetchCompetitions = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    competitions: query.data?.competitions ?? NO_COMPETITIONS,
    loading: query.isPending,
    error: query.error ? getUserFriendlyError(query.error) : null,
    registrationStatus: query.data?.registrationStatus ?? NO_STATUS,
    checkingRegistration,
    refreshRegistrationStatus,
    refetch: refetchCompetitions,
  };
}
