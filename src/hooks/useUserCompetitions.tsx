import { useEffect, useState } from "react";
import {
  getCompetitions,
  checkRegistration,
  getCompRegistrationInfo,
  getScoresBatch,
} from "@/services/api";
import { CompetitionResponse, ScoreBatchResponse } from "@/types";

export interface CompetitionWithScores {
  competition: CompetitionResponse;
  level: number;
  scores: ScoreBatchResponse[];
  summary: {
    totalProblems: number;
    problemsWithTop: number;
    problemsWithBonus: number;
    totalAttempts: number;
    averageAttempts: string;
  };
}

export function useUserCompetitions() {
  const [competitions, setCompetitions] = useState<CompetitionWithScores[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchUserCompetitions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get all competitions
        const allCompetitions = await getCompetitions();

        if (!active || !allCompetitions || allCompetitions.length === 0) {
          setCompetitions([]);
          return;
        }

        // Filter competitions the user is registered for and get their scores
        const userCompetitionsData: CompetitionWithScores[] = [];

        for (const comp of allCompetitions) {
          try {
            const isRegistered = await checkRegistration(comp.id);

            if (isRegistered) {
              const registration = await getCompRegistrationInfo(comp.id);

              if (registration && registration.level) {
                const scores = await getScoresBatch({
                  comp_id: comp.id,
                  level: registration.level,
                });

                // Calculate summary statistics
                const totalProblems = scores.length;
                const problemsWithTop = scores.filter((s) => s.score.attempts_to_top > 0).length;
                const problemsWithBonus = scores.filter(
                  (s) => s.score.attempts_to_bonus > 0
                ).length;
                const totalAttempts = scores.reduce((sum, s) => sum + s.score.attempts_total, 0);
                const attemptedProblems = scores.filter((s) => s.score.attempts_total > 0).length;
                const averageAttempts =
                  attemptedProblems > 0 ? (totalAttempts / attemptedProblems).toFixed(1) : "0";

                userCompetitionsData.push({
                  competition: comp,
                  level: registration.level,
                  scores,
                  summary: {
                    totalProblems,
                    problemsWithTop,
                    problemsWithBonus,
                    totalAttempts,
                    averageAttempts,
                  },
                });
              }
            }
          } catch (err) {
            console.error(`Error fetching data for competition ${comp.id}:`, err);
            // Continue with other competitions even if one fails
          }
        }

        if (!active) return;

        // Sort by date (most recent first)
        userCompetitionsData.sort(
          (a, b) =>
            new Date(b.competition.comp_date).getTime() -
            new Date(a.competition.comp_date).getTime()
        );

        setCompetitions(userCompetitionsData);
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Kunde inte hämta tävlingsdata";
        setError(message);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchUserCompetitions();

    return () => {
      active = false;
    };
  }, []);

  return { competitions, isLoading, error };
}
