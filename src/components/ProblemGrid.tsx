import { useCallback, useMemo, useState, useEffect } from "react";
import { Lock, Unlock } from "lucide-react";
import { ScoreBatchResponse } from "@/types";
import CalloutMessage from "./feedback/CalloutMessage";
import { Button } from "@radix-ui/themes";
import { useUpdateScore } from "@/hooks/useUpdateScore";
import { useUpdateScoreBatch } from "@/hooks/useUpdateScoreBatchResult";
import { canEditCompetition, isAdmin, isToday } from "@/utils/competitionUtils";
import { getGradeColor } from "@/constants/gradeColors";
import {
  buildScoreMap,
  isScoreChanged,
  sanitizeScoreValue,
  type ScoreField,
} from "@/utils/problemScore";
import { ProblemCard } from "./ProblemCard";

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
  onHasChangesChange?: (hasChanges: boolean) => void;
}

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
  onHasChangesChange,
}: ProblemGridProps) {
  const { saving, error: saveError, saveMessage, saveAll } = useUpdateScore();
  const {
    saving: batchSaving,
    error: batchSaveError,
    saveMessage: batchSaveMessage,
    saveAll: saveAllBatch,
  } = useUpdateScoreBatch();
  const [savingProblemNo, setSavingProblemNo] = useState<number | null>(null);
  const [savedProblemNo, setSavedProblemNo] = useState<number | null>(null);
  const [errorProblemNo, setErrorProblemNo] = useState<number | null>(null);
  const [adminOverride, setAdminOverride] = useState(false);
  const [collapsedProblems, setCollapsedProblems] = useState<Set<number>>(new Set());

  // Determine if editing is allowed
  const canEdit = useMemo(
    () => canEditCompetition(competitionDate, userScope, adminOverride),
    [competitionDate, userScope, adminOverride]
  );

  const userIsAdmin = isAdmin(userScope);
  const isCompetitionToday = isToday(competitionDate);

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

  const initialScoreMap = useMemo(() => buildScoreMap(initialProblems), [initialProblems]);

  const updateField = useCallback(
    (problemNo: number, field: ScoreField, value: number) => {
      const safeValue = sanitizeScoreValue(value);
      setProblems((prev) =>
        prev.map((p) =>
          p.problem_no === problemNo ? { ...p, score: { ...p.score, [field]: safeValue } } : p
        )
      );
    },
    [setProblems]
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

  const hasAnyChanges = useMemo(
    () =>
      problems.some((problem) =>
        isScoreChanged(problem.score, initialScoreMap.get(problem.problem_no))
      ),
    [problems, initialScoreMap]
  );

  useEffect(() => {
    onHasChangesChange?.(hasAnyChanges);
  }, [hasAnyChanges, onHasChangesChange]);

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

  const handleSaveProblem = async (problem: ScoreBatchResponse) => {
    if (!gradeLevel) return;
    setSavingProblemNo(problem.problem_no);
    const success = await saveAll(competitionId, gradeLevel, problem.problem_no, problem.score);
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
  };

  const idleSaveLabel = !canEdit
    ? "Redigering inaktiverad"
    : gradeLevel
      ? `Spara försök för ${viewingClimberName || "dig"}`
      : "Välj gradnivå för att spara";

  return (
    <div className="space-y-4">
      {batchSaveMessage && <CalloutMessage message={batchSaveMessage} color="green" />}
      {batchSaveError && <CalloutMessage message={batchSaveError} color="red" />}

      {/* Edit status and admin controls */}
      {!canEdit && (
        <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-yellow-700 dark:text-yellow-300 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
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
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            {adminOverride ? (
              <Unlock className="w-5 h-5 text-blue-700 dark:text-blue-300" />
            ) : (
              <Lock className="w-5 h-5 text-blue-700 dark:text-blue-300" />
            )}
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Admin</p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Aktivera för att redigera utanför tävlingsdagen
              </p>
            </div>
          </div>
          <Button
            onClick={() => setAdminOverride((prev) => !prev)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              adminOverride
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-card hover:bg-blue-100 dark:hover:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30"
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
            className={`bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-2 rounded-full
              shadow font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {batchSaving ? "Sparar alla..." : "Spara alla ändringar"}
          </Button>
        </div>
      )}

      {!problems.length && (
        <p className="text-center text-sm text-muted-foreground">
          Inga problem att visa ännu. Försök uppdatera sidan eller välj en annan tävling.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {problems.map((problem) => {
          const isSavingThis = saving && savingProblemNo === problem.problem_no;
          const inputsDisabled = isSavingThis || batchSaving || !canEdit;
          return (
            <ProblemCard
              key={problem.problem_no}
              problem={problem}
              isChanged={isScoreChanged(problem.score, initialScoreMap.get(problem.problem_no))}
              isCollapsed={collapsedProblems.has(problem.problem_no)}
              savedMessage={savedProblemNo === problem.problem_no ? saveMessage : null}
              errorMessage={errorProblemNo === problem.problem_no ? saveError : null}
              gradeColor={gradeColor}
              gradeLabel={gradeLabel}
              inputsDisabled={inputsDisabled}
              // Any in-flight single save blocks other saves: the hook holds one result at a time.
              saveDisabled={inputsDisabled || saving || !gradeLevel}
              saveLabel={isSavingThis ? "Sparar..." : idleSaveLabel}
              onToggleCollapse={toggleCollapse}
              onFieldChange={updateField}
              onSave={handleSaveProblem}
            />
          );
        })}
      </div>
    </div>
  );
}
