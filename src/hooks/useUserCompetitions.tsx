import { useEffect, useState } from "react";
import { getCompetitions, getCompRegistrationInfo, getScoresBatch } from "@/services/api";
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
        // Parallelize all competition checks instead of sequential loop
        const competitionResults = await Promise.allSettled(
          allCompetitions.map(async (comp) => {
            // getCompRegistrationInfo throws 404 if not registered — catch means "not registered"
            const registration = await getCompRegistrationInfo(comp.id).catch(() => null);
            if (!registration?.level) return null;

            // Then fetch scores for that level
            const scores = await getScoresBatch({
              comp_id: comp.id,
              level: registration.level,
            });

            if (scores.length === 0) return null;

            const totalProblems = scores.length;
            const { problemsWithTop, problemsWithBonus, totalAttempts, attemptedProblems } =
              scores.reduce(
                (acc, s) => ({
                  problemsWithTop: acc.problemsWithTop + (s.score.attempts_to_top > 0 ? 1 : 0),
                  problemsWithBonus:
                    acc.problemsWithBonus + (s.score.attempts_to_bonus > 0 ? 1 : 0),
                  totalAttempts: acc.totalAttempts + s.score.attempts_total,
                  attemptedProblems: acc.attemptedProblems + (s.score.attempts_total > 0 ? 1 : 0),
                }),
                { problemsWithTop: 0, problemsWithBonus: 0, totalAttempts: 0, attemptedProblems: 0 }
              );
            const averageAttempts =
              attemptedProblems > 0 ? (totalAttempts / attemptedProblems).toFixed(1) : "0";

            return {
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
            };
          })
        );

        const userCompetitionsData = competitionResults
          .filter(
            (r): r is PromiseFulfilledResult<CompetitionWithScores> =>
              r.status === "fulfilled" && r.value !== null
          )
          .map((r) => r.value);

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
