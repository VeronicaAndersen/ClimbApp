import { useState, useEffect, useCallback } from "react";
import { getAllClimbers } from "@/services/api";
import { ClimberResponse } from "@/types";

export function useClimbers(refreshKey?: number) {
  const [climbers, setClimbers] = useState<ClimberResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClimbers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllClimbers();
      setClimbers(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kunde inte hämta klättrare.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClimbers();
  }, [fetchClimbers, refreshKey]);

  return { climbers, loading, error, refetch: fetchClimbers };
}
