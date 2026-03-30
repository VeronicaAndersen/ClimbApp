import { useEffect, useState } from "react";
import { getCompRegistrationInfo, getMyInfo, getScoresBatch } from "@/services/api";
import { ScoreBatchResponse } from "@/types";

interface UseCompetitionScoresResult {
  loading: boolean;
  error: string | null;
  scores: ScoreBatchResponse[];
  climberId: number | null;
  selectedGrade: number | null;
}

export function useCompetitionScores(competitionId: number): UseCompetitionScoresResult {
  const [climberId, setClimberId] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [scores, setScores] = useState<ScoreBatchResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const init = async () => {
      try {
        setLoading(true);
        const [climber, compInfo] = await Promise.all([
          getMyInfo(),
          getCompRegistrationInfo(competitionId),
        ]);

        if (!alive) return;

        if (climber) setClimberId(climber.id);
        if (compInfo) setSelectedGrade(compInfo.level);

        if (!compInfo) {
          setError("Kunde inte hitta tävlingsnivå.");
          return;
        }

        const result = await getScoresBatch({ comp_id: competitionId, level: compInfo.level });
        if (!alive) return;

        setScores(result || []);
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : "Kunde inte hämta data.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    init();

    return () => {
      alive = false;
    };
  }, [competitionId]);

  return { loading, error, scores, climberId, selectedGrade };
}
