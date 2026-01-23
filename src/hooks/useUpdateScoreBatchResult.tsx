import { useState } from "react";
import { updateScoreBatch } from "@/services/api";
import { ScoreBatchResponse, ScoreBatch } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";

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

  const saveAll = async (
    competitionId: number,
    level: number,
    problems: ScoreBatchResponse[]
  ): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const payload: ScoreBatch = {
        items: problems.map((p) => {
          const hasTop = p.score.attempts_to_top > 0;
          const hasBonus = p.score.attempts_to_bonus > 0;

          return {
            problem_no: p.problem_no,
            attempts_total: p.score.attempts_total,
            got_bonus: hasBonus || hasTop, // Auto-set bonus if top is achieved
            got_top: hasTop,
            attempts_to_bonus: hasBonus ? p.score.attempts_to_bonus : (hasTop ? p.score.attempts_to_top : 0),
            attempts_to_top: p.score.attempts_to_top,
          };
        }),
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
  };

  return { saving, error, saveMessage, saveAll };
}
