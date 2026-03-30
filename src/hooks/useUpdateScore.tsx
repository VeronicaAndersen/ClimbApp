// updateScore
import { useState, useCallback } from "react";
import { updateScore } from "@/services/api";
import { ScoreRequest } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";
import { normalizeScorePayload } from "@/utils/competitionUtils";

type UseUpdateScore = {
  saving: boolean;
  error: string | null;
  saveMessage: string | null;
  saveAll: (
    competitionId: number,
    level: number,
    problem_no: number,
    problem: ScoreRequest
  ) => Promise<boolean>;
};

export function useUpdateScore(): UseUpdateScore {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const saveAll = useCallback(
    async (
      competitionId: number,
      level: number,
      problem_no: number,
      problem: ScoreRequest
    ): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSaveMessage(null);

      try {
        const result = await updateScore(
          { comp_id: competitionId, level, problem_no },
          normalizeScorePayload(problem)
        );

        if (!result) {
          setError("Misslyckades att spara.");
          return false;
        }

        setSaveMessage("Poäng sparades.");
        return true;
      } catch (err) {
        setError(getUserFriendlyError(err));
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return { saving, error, saveMessage, saveAll };
}
