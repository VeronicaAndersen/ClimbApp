import { useEffect, useState } from "react";
import { getMyInfo, getCompRegistrationInfo, getScoresBatch } from "@/services/api";
import { ScoreBatchResponse } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";

export function useScores(competitionId: number, refreshTrigger?: number) {
  const [climberId, setClimberId] = useState<number | null>(null);
  const [gradeLevel, setGradeLevel] = useState<number | null>(null);
  const [problems, setProblems] = useState<ScoreBatchResponse[]>([]);
  const [initialProblems, setInitialProblems] = useState<ScoreBatchResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [user, registration] = await Promise.all([
          getMyInfo(),
          getCompRegistrationInfo(competitionId),
        ]);

        if (!active) return;

        if (!user || !registration) {
          setError("Kunde inte hämta användar- eller tävlingsdata. Har du anmält dig?");
          return;
        }

        setClimberId(user.id);
        setGradeLevel(registration.level);

        const scores = await getScoresBatch({
          comp_id: competitionId,
          level: registration.level,
        });

        // Deep copy scores for initial state tracking
        const initialScoresCopy = scores.map((problem) => ({
          ...problem,
          score: { ...problem.score },
        }));

        setProblems(scores);
        setInitialProblems(initialScoresCopy);
      } catch (err) {
        setError(getUserFriendlyError(err));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [competitionId, refreshTrigger]);

  return {
    climberId,
    gradeLevel,
    problems,
    initialProblems,
    setProblems,
    setInitialProblems,
    isLoading,
    error,
  };
}
