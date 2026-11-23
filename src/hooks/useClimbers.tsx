import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllClimbers } from "@/services/api";
import { ClimberResponse } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";

interface UseClimbersResult {
  climbers: ClimberResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const NO_CLIMBERS: ClimberResponse[] = [];

export function useClimbers(refreshKey?: number): UseClimbersResult {
  const query = useQuery({
    queryKey: ["climbers", refreshKey],
    queryFn: async () => (await getAllClimbers()) ?? NO_CLIMBERS,
    // Climbers also change through profile edits elsewhere, so always
    // refetch on mount instead of trusting the global five-minute staleTime.
    staleTime: 0,
  });

  const { refetch } = query;
  const refetchClimbers = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    climbers: query.data ?? NO_CLIMBERS,
    loading: query.isPending,
    error: query.error ? getUserFriendlyError(query.error) : null,
    refetch: refetchClimbers,
  };
}
