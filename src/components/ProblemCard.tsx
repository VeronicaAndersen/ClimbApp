import { Star, Medal, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@radix-ui/themes";
import { ScoreBatchResponse } from "@/types";
import CalloutMessage from "./feedback/CalloutMessage";
import {
  MIN_SCORE_VALUE,
  SCORE_FIELDS,
  SCORE_FIELD_LABELS,
  sanitizeScoreValue,
  type ScoreField,
} from "@/utils/problemScore";

export interface ProblemCardProps {
  problem: ScoreBatchResponse;
  isChanged: boolean;
  isCollapsed: boolean;
  /** Success message to show on this card after a single save, if any. */
  savedMessage: string | null;
  /** Error message to show on this card after a failed save, if any. */
  errorMessage: string | null;
  gradeColor: string;
  gradeLabel: string;
  /** Disables the score inputs and steppers. */
  inputsDisabled: boolean;
  saveDisabled: boolean;
  saveLabel: string;
  onToggleCollapse: (problemNo: number) => void;
  onFieldChange: (problemNo: number, field: ScoreField, value: number) => void;
  onSave: (problem: ScoreBatchResponse) => void;
}

export function ProblemCard({
  problem,
  isChanged,
  isCollapsed,
  savedMessage,
  errorMessage,
  gradeColor,
  gradeLabel,
  inputsDisabled,
  saveDisabled,
  saveLabel,
  onToggleCollapse,
  onFieldChange,
  onSave,
}: ProblemCardProps) {
  const step = (key: ScoreField, delta: number) => {
    const current = typeof problem.score[key] === "number" ? Number(problem.score[key]) : 0;
    onFieldChange(problem.problem_no, key, current + delta);
  };

  return (
    <div
      className={`relative p-4 rounded-xl shadow-sm flex flex-col border transition-all
                ${isChanged ? "border-yellow-500" : "border-border"}
              `}
    >
      {savedMessage && <CalloutMessage message={savedMessage} color="green" />}
      {errorMessage && <CalloutMessage message={errorMessage} color="red" />}

      {isChanged && !savedMessage && (
        <span
          className={`absolute top-2 right-2 text-xs font-medium text-yellow-700 dark:text-yellow-300
                      bg-yellow-100 dark:bg-yellow-500/15 border border-yellow-300 dark:border-yellow-500/30 rounded-md px-2 py-0.5`}
        >
          Ej sparad
        </span>
      )}

      <div
        className="flex justify-between items-center py-6 cursor-pointer"
        onClick={() => onToggleCollapse(problem.problem_no)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Problem {problem.problem_no}</h3>
          <span
            className="w-5 h-5 rounded-full border border-foreground/25"
            style={{ backgroundColor: gradeColor }}
            title={gradeLabel}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          B{problem.score.attempts_to_bonus}T{problem.score.attempts_to_top}
        </p>
        <div className="flex gap-1 items-center">
          {problem.score.attempts_to_bonus > 0 && (
            <Star className="w-5 h-5 text-primary" aria-hidden />
          )}
          {problem.score.attempts_to_top > 0 && (
            <Medal className="w-5 h-5 text-amber-300" aria-hidden />
          )}
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronUp className="w-5 h-5 text-muted-foreground" aria-hidden />
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          {SCORE_FIELDS.map((key) => (
            <div key={key} className="flex flex-row justify-between m-2">
              <label
                htmlFor={`problem-${problem.problem_no}-${key}`}
                className="block text-sm text-muted-foreground font-medium capitalize mb-1"
              >
                {SCORE_FIELD_LABELS[key]}
              </label>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => step(key, -1)}
                  disabled={inputsDisabled}
                  className={`w-8 h-8 rounded-full bg-primary hover:bg-primary-hover
                                    text-primary-foreground font-bold text-lg cursor-pointer`}
                  aria-label={`Minska ${SCORE_FIELD_LABELS[key]}`}
                >
                  −
                </Button>
                <input
                  id={`problem-${problem.problem_no}-${key}`}
                  type="number"
                  disabled={inputsDisabled}
                  min={MIN_SCORE_VALUE}
                  inputMode="numeric"
                  value={String(sanitizeScoreValue(Number(problem.score[key])))}
                  onChange={(event) =>
                    onFieldChange(problem.problem_no, key, Number(event.target.value))
                  }
                  className="w-14 text-center border border-input bg-card text-foreground rounded-full px-2 py-1 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  onClick={() => step(key, 1)}
                  disabled={inputsDisabled}
                  className={`w-8 h-8 rounded-full bg-primary hover:bg-primary-hover
                                    text-primary-foreground font-bold text-lg cursor-pointer`}
                  aria-label={`Öka ${SCORE_FIELD_LABELS[key]}`}
                >
                  +
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-center">
            <Button
              onClick={() => onSave(problem)}
              disabled={saveDisabled}
              className={`bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-2 mt-4 rounded-full
                        shadow font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed w-full`}
            >
              {saveLabel}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
