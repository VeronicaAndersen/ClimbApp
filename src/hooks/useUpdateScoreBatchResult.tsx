import { useState, useCallback } from "react";
import { updateScoreBatch } from "@/services/api";
import { ScoreBatchResponse, ScoreBatch } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";
import { normalizeScorePayload } from "@/utils/competitionUtils";

type UseUpdateScoreBatchResult = {
  saving: boolean;
  error: string | null;
  saveMessage: string | null;
  saveAll: (
    competitionId: number,
    level: number,
    problems: ScoreBatchResponse[]
  ) => Promise<boolean>;
};

export function useUpdateScoreBatch(): UseUpdateScoreBatchResult {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const saveAll = useCallback(
    async (
      competitionId: number,
      level: number,
      problems: ScoreBatchResponse[]
    ): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSaveMessage(null);

      try {
        const payload: ScoreBatch = {
          items: problems.map((p) => ({
            problem_no: p.problem_no,
            ...normalizeScorePayload(p.score),
          })),
        };

        const result = await updateScoreBatch({ comp_id: competitionId, level }, payload);

        if (!result) {
          setError("Misslyckades att spara.");
          return false;
        }

        setSaveMessage("Alla poäng sparades.");
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
