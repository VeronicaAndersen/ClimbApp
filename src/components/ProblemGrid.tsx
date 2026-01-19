import { useCallback, useMemo, useState, useEffect } from "react";
import { Star, Medal, Lock, Unlock, ChevronDown, ChevronUp } from "lucide-react";
import { ScoreBatchResponse } from "@/types";
import CalloutMessage from "./user_feedback/CalloutMessage";
import { Button } from "@radix-ui/themes";
import { useUpdateScore } from "@/hooks/useUpdateScore";
import { useUpdateScoreBatch } from "@/hooks/useUpdateScoreBatchResult";
import { canEditCompetition, isAdmin, isToday } from "@/utils/competitionUtils";
import { getGradeColor } from "@/constants/gradeColors";

interface ProblemGridProps {
  competitionId: number;
  competitionDate: string;
  userScope: string;
  viewingClimberName?: string;
  problems: ScoreBatchResponse[];
  initialProblems: ScoreBatchResponse[];
  setProblems: React.Dispatch<React.SetStateAction<ScoreBatchResponse[]>>;
  setInitialProblems: React.Dispatch<React.SetStateAction<ScoreBatchResponse[]>>;
  gradeLevel: number | null;
}

const SCORE_FIELDS = ["attempts_total", "attempts_to_bonus", "attempts_to_top"] as const;
const SCORE_FIELD_LABELS: Record<(typeof SCORE_FIELDS)[number], string> = {
  attempts_total: "Antal försök",
  attempts_to_bonus: "Bonus",
  attempts_to_top: "Topp",
};

const MIN_SCORE_VALUE = 0;

export default function ProblemGrid({
  competitionId,
  competitionDate,
  userScope,
  viewingClimberName,
  problems,
  initialProblems,
  setProblems,
  setInitialProblems,
  gradeLevel,
}: ProblemGridProps) {
  const { saving, error: saveError, saveMessage, saveAll } = useUpdateScore();
  const {
    saving: batchSaving,
    error: batchSaveError,
    saveMessage: batchSaveMessage,
    saveAll: saveAllBatch,
  } = useUpdateScoreBatch();
  const [savedProblemNo, setSavedProblemNo] = useState<number | null>(null);
  const [errorProblemNo, setErrorProblemNo] = useState<number | null>(null);
  const [adminOverride, setAdminOverride] = useState(false);
  const [collapsedProblems, setCollapsedProblems] = useState<Set<number>>(new Set());

  // Determine if editing is allowed
  const canEdit = useMemo(
    () => canEditCompetition(competitionDate, userScope, adminOverride),
    [competitionDate, userScope, adminOverride]
  );

  const userIsAdmin = useMemo(() => isAdmin(userScope), [userScope]);
  const isCompetitionToday = useMemo(() => isToday(competitionDate), [competitionDate]);

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

  const gradeColor = useMemo(() => getGradeColor(gradeLevel), [gradeLevel]);

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

  const toggleCollapse = useCallback((problemNo: number) => {
    setCollapsedProblems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(problemNo)) {
        newSet.delete(problemNo);
      } else {
        newSet.add(problemNo);
      }
      return newSet;
    });
  }, []);

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

  return (
    <div className="space-y-4">
      {batchSaveMessage && <CalloutMessage message={batchSaveMessage} color="green" />}
      {batchSaveError && <CalloutMessage message={batchSaveError} color="red" />}

      {/* Edit status and admin controls */}
      {!canEdit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-yellow-700 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                {isCompetitionToday
                  ? "Redigering är aktiverad för tävlingsdagen"
                  : "Tävlingen har inte öppnat ännu."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin override toggle */}
      {userIsAdmin && !isCompetitionToday && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            {adminOverride ? (
              <Unlock className="w-5 h-5 text-blue-700" />
            ) : (
              <Lock className="w-5 h-5 text-blue-700" />
            )}
            <div>
              <p className="text-sm font-medium text-blue-800">Admin</p>
              <p className="text-xs text-blue-700">
                Aktivera för att redigera utanför tävlingsdagen
              </p>
            </div>
          </div>
          <Button
            onClick={() => setAdminOverride(!adminOverride)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              adminOverride
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-white hover:bg-blue-100 text-blue-700 border border-blue-300"
            }`}
          >
            {adminOverride ? "Inaktivera" : "Aktivera"}
          </Button>
        </div>
      )}

      {problems.length > 0 && canEdit && (
        <div className="flex justify-end mb-4">
          <Button
            onClick={handleSaveAll}
            disabled={batchSaving || !gradeLevel || !hasAnyChanges}
            className={`bg-[--secondary-color] hover:bg-[--primary-color-hover] text-white px-6 py-2 rounded-full
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
          const isCollapsed = collapsedProblems.has(problem.problem_no);

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

              <div
                className="flex justify-between items-center py-6 cursor-pointer"
                onClick={() => toggleCollapse(problem.problem_no)}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Problem {problem.problem_no}
                  </h3>
                  <span
                    className="w-5 h-5 rounded-full border border-gray-300"
                    style={{ backgroundColor: gradeColor }}
                    title={gradeLabel}
                  />
                </div>
                <p className="text-sm text-[--primary-color-hover]">
                  B{problem.score.attempts_to_bonus}T{problem.score.attempts_to_top}
                </p>
                <div className="flex gap-1 items-center">
                  {problem.score.attempts_to_bonus > 0 && (
                    <Star className="w-5 h-5 text-[--primary-color]" aria-hidden />
                  )}
                  {problem.score.attempts_to_top > 0 && (
                    <Medal className="w-5 h-5 text-amber-300" aria-hidden />
                  )}
                  {isCollapsed ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" aria-hidden />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-gray-600" aria-hidden />
                  )}
                </div>
              </div>

              {!isCollapsed && (
                <>
                  {SCORE_FIELDS.map((key) => (
                    <div key={key} className="flex flex-row justify-between m-2">
                      <label
                        htmlFor={`problem-${problem.problem_no}-${key}`}
                        className="block text-sm text-[--primary-color-hover] font-medium capitalize mb-1"
                      >
                        {SCORE_FIELD_LABELS[key]}
                      </label>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => dec(problem, key)}
                          disabled={saving || !canEdit}
                          className={`w-8 h-8 rounded-full bg-[--secondary-color] hover:bg-[--primary-color-hover]
                                    text-white font-bold text-lg cursor-pointer`}
                          aria-label={`Minska ${SCORE_FIELD_LABELS[key]}`}
                        >
                          −
                        </Button>
                        <input
                          id={`problem-${problem.problem_no}-${key}`}
                          type="number"
                          disabled={saving || !canEdit}
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
                          disabled={saving || !canEdit}
                          className={`w-8 h-8 rounded-full bg-[--secondary-color] hover:bg-[--primary-color-hover]
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

                          // Auto-collapse if problem has a top
                          if (problem.score.attempts_to_top > 0) {
                            setTimeout(() => {
                              toggleCollapse(problem.problem_no);
                            }, 1500); // Wait 1.5 seconds to show success message first
                          }
                        } else {
                          // Track which problem had an error
                          setErrorProblemNo(problem.problem_no);
                          setSavedProblemNo(null); // Clear any previous success message
                        }
                      }}
                      disabled={saving || !gradeLevel || !canEdit}
                      className={`bg-[--secondary-color] hover:bg-[--primary-color-hover] text-white px-6 py-2 mt-4 rounded-full
                        shadow font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed w-full`}
                    >
                      {saving
                        ? "Sparar..."
                        : !canEdit
                          ? "Redigering inaktiverad"
                          : gradeLevel
                            ? `Spara försök för ${viewingClimberName || "dig"}`
                            : "Välj gradnivå för att spara"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
