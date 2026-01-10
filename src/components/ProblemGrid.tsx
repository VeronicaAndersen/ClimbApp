import { useCallback, useMemo, useState, useEffect } from "react";
import { Star, Medal } from "lucide-react";
import { ScoreBatchResponse } from "@/types";
import { useScores } from "@/hooks/useScores";
import CalloutMessage from "./user_feedback/CalloutMessage";
import { Button, Spinner } from "@radix-ui/themes";
import { useUpdateScore } from "@/hooks/useUpdateScore";
import { useUpdateScoreBatch } from "@/hooks/useUpdateScoreBatchResult";

interface ProblemGridProps {
  competitionId: number;
}
//change gradeLevel to hex color codes for different levels
const DEFAULT_GRADE_COLOR = "#D1D5DB";
const gradeColors: Record<number, string> = {
  1: "#C084FC",
  2: "#F9A8D4",
  3: "#FDBA74",
  4: "#FACC15",
  5: "#4ADE80",
  6: "#FFFFFF",
  7: "#000000",
};

const SCORE_FIELDS = ["attempts_total", "attempts_to_bonus", "attempts_to_top"] as const;
const SCORE_FIELD_LABELS: Record<(typeof SCORE_FIELDS)[number], string> = {
  attempts_total: "Totalt antal försök",
  attempts_to_bonus: "Försök till bonus",
  attempts_to_top: "Försök till topp",
};

const MIN_SCORE_VALUE = 0;

export default function ProblemGrid({ competitionId }: ProblemGridProps) {
  const {
    problems,
    initialProblems,
    setProblems,
    setInitialProblems,
    isLoading,
    error,
    gradeLevel,
  } = useScores(competitionId);

  const { saving, error: saveError, saveMessage, saveAll } = useUpdateScore();
  const {
    saving: batchSaving,
    error: batchSaveError,
    saveMessage: batchSaveMessage,
    saveAll: saveAllBatch,
  } = useUpdateScoreBatch();
  const [savedProblemNo, setSavedProblemNo] = useState<number | null>(null);
  const [errorProblemNo, setErrorProblemNo] = useState<number | null>(null);

  // Clear the saved problem message after 3 seconds
  useEffect(() => {
    if (savedProblemNo !== null) {
      const timer = setTimeout(() => {
        setSavedProblemNo(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [savedProblemNo]);

  // Clear the error problem message after 5 seconds
  useEffect(() => {
    if (errorProblemNo !== null) {
      const timer = setTimeout(() => {
        setErrorProblemNo(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorProblemNo]);

  const gradeColor = useMemo(() => {
    if (!gradeLevel) {
      return DEFAULT_GRADE_COLOR;
    }
    return gradeColors[gradeLevel] ?? DEFAULT_GRADE_COLOR;
  }, [gradeLevel]);

  const gradeLabel = gradeLevel ? `Gradnivå: ${gradeLevel}` : "Gradnivå: ej tilldelad";

  const initialScoreMap = useMemo(() => {
    const map = new Map<number, ScoreBatchResponse["score"]>();
    initialProblems.forEach((problem) => {
      map.set(problem.problem_no, problem.score);
    });
    return map;
  }, [initialProblems]);

  const sanitizeValue = useCallback((value: number) => {
    if (Number.isNaN(value) || value < MIN_SCORE_VALUE) {
      return MIN_SCORE_VALUE;
    }
    return Math.floor(value);
  }, []);

  const updateField = useCallback(
    (problemNo: number, field: keyof ScoreBatchResponse["score"], value: number) => {
      const safeValue = sanitizeValue(value);
      setProblems((prev) =>
        prev.map((p) =>
          p.problem_no === problemNo ? { ...p, score: { ...p.score, [field]: safeValue } } : p
        )
      );
    },
    [sanitizeValue, setProblems]
  );

  const inc = useCallback(
    (problem: ScoreBatchResponse, key: keyof ScoreBatchResponse["score"]) => {
      const current = typeof problem.score[key] === "number" ? Number(problem.score[key]) : 0;
      updateField(problem.problem_no, key, current + 1);
    },
    [updateField]
  );

  const dec = useCallback(
    (problem: ScoreBatchResponse, key: keyof ScoreBatchResponse["score"]) => {
      const current = typeof problem.score[key] === "number" ? Number(problem.score[key]) : 0;
      updateField(problem.problem_no, key, current - 1);
    },
    [updateField]
  );

  const hasAnyChanges = useMemo(() => {
    return problems.some((problem) => {
      const originalScore = initialScoreMap.get(problem.problem_no);
      return SCORE_FIELDS.some((field) => {
        const currentValue = Number(problem.score[field]) || 0;
        const originalValue = Number(originalScore?.[field]) || 0;
        return currentValue !== originalValue;
      });
    });
  }, [problems, initialScoreMap]);

  const handleSaveAll = async () => {
    if (!gradeLevel) return;

    const success = await saveAllBatch(competitionId, gradeLevel, problems);

    if (success) {
      // Update initialProblems to reflect all saved states
      setInitialProblems(JSON.parse(JSON.stringify(problems)));
      setSavedProblemNo(null);
      setErrorProblemNo(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="3" />
        <span className="ml-2">Hämtar poäng...</span>
      </div>
    );
  }
  if (error) return <CalloutMessage message={error} color="red" />;

  return (
    <div className="space-y-4">
      {batchSaveMessage && <CalloutMessage message={batchSaveMessage} color="green" />}
      {batchSaveError && <CalloutMessage message={batchSaveError} color="red" />}

      {problems.length > 0 && (
        <div className="flex justify-end mb-4">
          <Button
            onClick={handleSaveAll}
            disabled={batchSaving || !gradeLevel || !hasAnyChanges}
            className={`bg-[#505654] hover:bg-[#7b8579] text-white px-6 py-2 rounded-full
              shadow font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {batchSaving ? "Sparar alla..." : "Spara alla ändringar"}
          </Button>
        </div>
      )}

      {!problems.length && (
        <p className="text-center text-sm text-gray-500">
          Inga problem att visa ännu. Försök uppdatera sidan eller välj en annan tävling.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {problems.map((problem) => {
          const originalScore = initialScoreMap.get(problem.problem_no);
          const isChanged = SCORE_FIELDS.some((field) => {
            const currentValue = Number(problem.score[field]) || 0;
            const originalValue = Number(originalScore?.[field]) || 0;
            return currentValue !== originalValue;
          });

          const isSaved = savedProblemNo === problem.problem_no && saveMessage;
          const hasError = errorProblemNo === problem.problem_no && saveError;

          return (
            <div
              key={problem.problem_no}
              className={`relative p-4 rounded-xl shadow-sm flex flex-col border transition-all
                ${isChanged ? "border-yellow-500" : "border-gray-300"}
              `}
            >
              {isSaved && <CalloutMessage message={saveMessage} color="green" />}
              {hasError && <CalloutMessage message={saveError} color="red" />}

              {isChanged && !isSaved && (
                <span
                  className={`absolute top-2 right-2 text-xs font-medium text-yellow-700 
                      bg-yellow-100 border border-yellow-300 rounded-md px-2 py-0.5`}
                >
                  Ej sparad
                </span>
              )}

              <div className="flex justify-between items-center py-6">
                <div className="flex items-center gap-2 ">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Problem {problem.problem_no}
                  </h3>
                  <span
                    className="w-5 h-5 rounded-full border border-gray-300"
                    style={{ backgroundColor: gradeColor }}
                    title={gradeLabel}
                  />
                </div>
                <p className="text-sm text-[#7b8579]">
                  B{problem.score.attempts_to_bonus}T{problem.score.attempts_to_top}
                </p>
                <div className="flex gap-1">
                  {problem.score.attempts_to_bonus > 0 && (
                    <Star className="w-5 h-5 text-[#c6d1b8]/80" aria-hidden />
                  )}
                  {problem.score.attempts_to_top > 0 && (
                    <Medal className="w-5 h-5 text-amber-300" aria-hidden />
                  )}
                </div>
              </div>

              {SCORE_FIELDS.map((key) => (
                <div key={key} className="flex flex-row justify-between m-2">
                  <label
                    htmlFor={`problem-${problem.problem_no}-${key}`}
                    className="block text-sm text-[#7b8579] font-medium capitalize mb-1"
                  >
                    {SCORE_FIELD_LABELS[key]}
                  </label>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => dec(problem, key)}
                      disabled={saving}
                      className={`w-8 h-8 rounded-full bg-[#505654] hover:bg-[#7b8579] 
                                text-white font-bold text-lg cursor-pointer`}
                      aria-label={`Minska ${SCORE_FIELD_LABELS[key]}`}
                    >
                      −
                    </Button>
                    <input
                      id={`problem-${problem.problem_no}-${key}`}
                      type="number"
                      disabled={saving}
                      min={MIN_SCORE_VALUE}
                      inputMode="numeric"
                      value={String(sanitizeValue(Number(problem.score[key])))}
                      onChange={(event) =>
                        updateField(problem.problem_no, key, Number(event.target.value))
                      }
                      className="w-14 text-center border border-gray-300 rounded-full px-2 py-1 text-base"
                    />
                    <Button
                      onClick={() => inc(problem, key)}
                      disabled={saving}
                      className={`w-8 h-8 rounded-full bg-[#505654] hover:bg-[#7b8579] 
                                text-white font-bold text-lg cursor-pointer`}
                      aria-label={`Öka ${SCORE_FIELD_LABELS[key]}`}
                    >
                      +
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-center">
                <Button
                  onClick={async () => {
                    if (!gradeLevel) return;
                    const success = await saveAll(
                      competitionId,
                      gradeLevel,
                      problem.problem_no,
                      problem.score
                    );
                    if (success) {
                      // Track which problem was saved to show message over it
                      setSavedProblemNo(problem.problem_no);
                      setErrorProblemNo(null); // Clear any previous error
                      // Update initialProblems to reflect the saved state, so isChanged will be false
                      setInitialProblems((prev) =>
                        prev.map((p) =>
                          p.problem_no === problem.problem_no
                            ? {
                                ...p,
                                score: {
                                  attempts_total: problem.score.attempts_total,
                                  got_bonus: problem.score.got_bonus,
                                  got_top: problem.score.got_top,
                                  attempts_to_bonus: problem.score.attempts_to_bonus,
                                  attempts_to_top: problem.score.attempts_to_top,
                                },
                              }
                            : p
                        )
                      );
                    } else {
                      // Track which problem had an error
                      setErrorProblemNo(problem.problem_no);
                      setSavedProblemNo(null); // Clear any previous success message
                    }
                  }}
                  disabled={saving || !gradeLevel}
                  className={`bg-[#505654] hover:bg-[#7b8579] text-white px-6 py-2 mt-4 rounded-full 
                    shadow font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed w-full`}
                >
                  {saving
                    ? "Sparar..."
                    : gradeLevel
                      ? "Spara försök"
                      : "Välj gradnivå för att spara"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
