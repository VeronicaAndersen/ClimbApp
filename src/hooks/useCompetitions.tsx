import { checkRegistration, getCompetitions } from "@/services/api";
import { CompetitionResponse } from "@/types";
import { useCallback, useEffect, useState } from "react";

interface UseCompetitionsResult {
  competitions: CompetitionResponse[];
  loading: boolean;
  error: string | null;
  registrationStatus: Record<number, boolean>;
  checkingRegistration: Record<number, boolean>;
  refreshRegistrationStatus: (competitionId: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useCompetitions(refreshKey?: number): UseCompetitionsResult {
  const [competitions, setCompetitions] = useState<CompetitionResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<Record<number, boolean>>({});
  const [checkingRegistration, setCheckingRegistration] = useState<Record<number, boolean>>({});

  const refreshRegistrationStatus = useCallback(async (competitionId: number) => {
    setCheckingRegistration((prev) => ({ ...prev, [competitionId]: true }));
    try {
      const isRegistered = await checkRegistration(competitionId);
      setRegistrationStatus((prev) => ({ ...prev, [competitionId]: !!isRegistered }));
    } catch (err) {
      console.error(`Error checking registration for competition ${competitionId}:`, err);
      setRegistrationStatus((prev) => ({ ...prev, [competitionId]: false }));
    } finally {
      setCheckingRegistration((prev) => ({ ...prev, [competitionId]: false }));
    }
  }, []);

  const fetchCompetitions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCompetitions();

      if (data.length > 0) {
        setCompetitions(data);

        // Check all registrations in parallel instead of sequentially
        const registrationChecks = await Promise.allSettled(
          data.map(async (comp) => {
            try {
              const isRegistered = await checkRegistration(comp.id);
              return { id: comp.id, isRegistered: !!isRegistered };
            } catch (err) {
              console.error(`Error checking registration for competition ${comp.id}:`, err);
              return { id: comp.id, isRegistered: false };
            }
          })
        );

        const statusMap: Record<number, boolean> = {};
        for (const result of registrationChecks) {
          if (result.status === "fulfilled") {
            statusMap[result.value.id] = result.value.isRegistered;
          }
        }

        setRegistrationStatus(statusMap);
      } else {
        setCompetitions([]);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ett fel uppstod vid hämtning av tävlingar.";
      setError(message);
      console.error("Error fetching competitions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions, refreshKey]);

  return {
    competitions,
    loading,
    error,
    registrationStatus,
    checkingRegistration,
    refreshRegistrationStatus,
    refetch: fetchCompetitions,
  };
}
