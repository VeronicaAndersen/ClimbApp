import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, Lock, Unlock } from "lucide-react";
import { ScoreBatchResponse } from "@/types";
import { useUpdateScore } from "@/hooks/useUpdateScore";
import { useUpdateScoreBatch } from "@/hooks/useUpdateScoreBatchResult";
import { canEditCompetition, isAdmin, isToday } from "@/utils/competitionUtils";
import { getGradeColor } from "@/constants/gradeColors";
import { haptic } from "@/lib/utils";
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

  const changedCount = useMemo(
    () =>
      problems.filter((problem) =>
        isScoreChanged(problem.score, initialScoreMap.get(problem.problem_no))
      ).length,
    [problems, initialScoreMap]
  );
  const hasAnyChanges = changedCount > 0;

  // The bar keeps its last count while it fades out instead of flashing "0".
  const lastChangedCount = useRef(changedCount);
  if (changedCount > 0) lastChangedCount.current = changedCount;

  // After a batch save the bar stays up briefly to confirm it, then leaves.
  const [batchJustSaved, setBatchJustSaved] = useState(false);
  useEffect(() => {
    if (!batchJustSaved) return;
    const timer = setTimeout(() => setBatchJustSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [batchJustSaved]);

  useEffect(() => {
    onHasChangesChange?.(hasAnyChanges);
  }, [hasAnyChanges, onHasChangesChange]);

  const handleSaveAll = async () => {
    if (!gradeLevel) return;

    const success = await saveAllBatch(competitionId, gradeLevel, problems);

    if (success) {
      haptic();
      setBatchJustSaved(true);
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
      haptic();
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

  const saveBarVisible =
    canEdit &&
    problems.length > 0 &&
    (hasAnyChanges || batchSaving || batchJustSaved || Boolean(batchSaveError));
  const showBatchSuccess = batchJustSaved && !hasAnyChanges && !batchSaveError;

  const idleSaveLabel = !canEdit
    ? "Redigering inaktiverad"
    : gradeLevel
      ? `Spara försök för ${viewingClimberName || "dig"}`
      : "Välj gradnivå för att spara";

  return (
    // Reserve room at the bottom so the floating save bar never covers the last card.
    <div className={canEdit ? "space-y-4 pb-20" : "space-y-4"}>
      {/* Edit status and admin controls */}
      {!canEdit && (
        <div className="notice">
          <Lock className="w-5 h-5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="font-medium">
            {isCompetitionToday
              ? "Redigering är aktiverad för tävlingsdagen"
              : "Tävlingen har inte öppnat ännu."}
          </p>
        </div>
      )}

      {/* Admin override toggle */}
      {userIsAdmin && !isCompetitionToday && (
        <div className="notice items-center justify-between">
          <div className="flex items-center gap-3">
            {adminOverride ? (
              <Unlock className="w-5 h-5 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <Lock className="w-5 h-5 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <div>
              <p className="font-medium">Admin</p>
              <p className="text-xs text-muted-foreground">
                Aktivera för att redigera utanför tävlingsdagen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAdminOverride((prev) => !prev)}
            aria-pressed={adminOverride}
            className={`${adminOverride ? "btn-primary" : "btn-secondary"} shrink-0 px-4 text-sm`}
          >
            {adminOverride ? "Inaktivera" : "Aktivera"}
          </button>
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

      {/*
       * Floating save bar: rises from the bottom edge when there is unsaved work
       * and leaves the same way. Portalled so no transformed or blurred ancestor
       * can trap its fixed position.
       */}
      {createPortal(
        <div
          aria-hidden={!saveBarVisible}
          ref={(el) => el?.toggleAttribute("inert", !saveBarVisible)}
          className={`floating-bar pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 transition-[transform,opacity] duration-500 ease-apple md:bottom-6 ${
            saveBarVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="material pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-full border border-border/60 py-2 pl-5 pr-2 shadow-material">
            {/* Result of the batch save lives where the user tapped, not at the top of the page. */}
            <span
              role="status"
              className={`tabular min-w-0 text-sm font-medium text-foreground ${batchSaveError ? "hidden" : ""}`}
            >
              {batchSaveError ? null : showBatchSuccess ? (
                <span className="flex items-center gap-1.5 text-green-700 dark:text-green-300">
                  <Check className="h-4 w-4" aria-hidden />
                  {batchSaveMessage || "Allt sparat"}
                </span>
              ) : lastChangedCount.current === 1 ? (
                "1 osparat problem"
              ) : (
                `${lastChangedCount.current} osparade problem`
              )}
            </span>
            <span
              role="alert"
              className={`min-w-0 text-sm font-medium text-destructive ${batchSaveError ? "" : "sr-only"}`}
            >
              {batchSaveError}
            </span>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={batchSaving || !gradeLevel}
              className="btn-primary shrink-0 text-sm"
            >
              {batchSaving ? "Sparar alla..." : "Spara alla ändringar"}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
