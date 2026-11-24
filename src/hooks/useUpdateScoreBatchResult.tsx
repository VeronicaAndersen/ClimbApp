import { useState, useCallback } from "react";
import { updateScoreBatch } from "@/services/api";
import { ScoreBatchResponse, ScoreBatch } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";
import { normalizeScorePayload } from "@/utils/competitionUtils";
import { formatProblemList, problemErrorsFromBatchError } from "@/utils/validationIssues";

type UseUpdateScoreBatchResult = {
  saving: boolean;
  error: string | null;
  /** Error per problem number when the API named the failing items. */
  problemErrors: Record<number, string>;
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
  const [problemErrors, setProblemErrors] = useState<Record<number, string>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const saveAll = useCallback(
    async (
      competitionId: number,
      level: number,
      problems: ScoreBatchResponse[]
    ): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setProblemErrors({});
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
        const perProblem = problemErrorsFromBatchError(
          err,
          problems.map((p) => p.problem_no)
        );
        const failedNos = Object.keys(perProblem)
          .map(Number)
          .sort((a, b) => a - b);
        setProblemErrors(perProblem);
        setError(
          failedNos.length > 0
            ? `Kunde inte spara ${formatProblemList(failedNos)}. Inget sparades.`
            : getUserFriendlyError(err)
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return { saving, error, problemErrors, saveMessage, saveAll };
}
