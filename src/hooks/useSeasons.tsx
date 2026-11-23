import { useEffect, useState, useCallback } from "react";
import { getSeasons } from "@/services/api";
import { SeasonResponse } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";

interface UseSeasonsResult {
  seasons: SeasonResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSeasons(refreshKey?: number): UseSeasonsResult {
  const [seasons, setSeasons] = useState<SeasonResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSeasons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSeasons();
      if (data) {
        setSeasons(data);
      }
    } catch (err) {
      const message = getUserFriendlyError(err);
      setError(message);
      console.error("Error fetching seasons:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeasons();
  }, [refreshKey, fetchSeasons]);

  return {
    seasons,
    loading,
    error,
    refetch: fetchSeasons,
  };
}
