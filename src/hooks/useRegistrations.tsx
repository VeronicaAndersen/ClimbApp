import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllRegistrations } from "@/services/api";
import { RegistrationWithClimber } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";

type RegistrationChange = Partial<Pick<RegistrationWithClimber, "approved" | "level">>;

interface UseRegistrationsResult {
  registrations: RegistrationWithClimber[];
  /** True until the first response for this competition arrives. */
  loading: boolean;
  /** True while any request is in flight, refetches included. */
  fetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Applies a change the server already accepted, without refetching. */
  applyChange: (userId: number, change: RegistrationChange) => void;
}

const NO_REGISTRATIONS: RegistrationWithClimber[] = [];

const registrationsKey = (competitionId: number, refreshKey?: number) =>
  ["registrations", competitionId, refreshKey] as const;

/** Every registration for one competition, approved or not (admin view). */
export function useRegistrations(
  competitionId: number,
  refreshKey?: number
): UseRegistrationsResult {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: registrationsKey(competitionId, refreshKey),
    queryFn: async () => (await getAllRegistrations(competitionId)) ?? NO_REGISTRATIONS,
    // Climbers register at any time, so always refetch on mount.
    staleTime: 0,
  });

  const { refetch } = query;
  const refetchRegistrations = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const applyChange = useCallback(
    (userId: number, change: RegistrationChange) => {
      queryClient.setQueryData<RegistrationWithClimber[]>(
        registrationsKey(competitionId, refreshKey),
        (prev) => prev?.map((reg) => (reg.user_id === userId ? { ...reg, ...change } : reg))
      );
    },
    [queryClient, competitionId, refreshKey]
  );

  return {
    registrations: query.data ?? NO_REGISTRATIONS,
    loading: query.isPending,
    fetching: query.isFetching,
    error: query.error ? getUserFriendlyError(query.error) : null,
    refetch: refetchRegistrations,
    applyChange,
  };
}
