import { useMemo, ReactNode } from "react";
import { ScoreBatchResponse } from "@/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ScoreHistoryProps {
  currentProblems: ScoreBatchResponse[];
  initialProblems: ScoreBatchResponse[];
}

interface ProblemChange {
  problemNo: number;
  attemptsChange: number;
  bonusChange: number;
  topChange: number;
  current: ScoreBatchResponse["score"];
  initial: ScoreBatchResponse["score"];
}

type ChangeType = "positive" | "negative" | "neutral";

const getChangeType = (value: number): ChangeType => {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
};

const getChangeIcon = (change: number): ReactNode => {
  const type = getChangeType(change);
  switch (type) {
    case "positive":
      return <TrendingUp className="w-4 h-4 text-green-600" aria-label="Ökning" />;
    case "negative":
      return <TrendingDown className="w-4 h-4 text-red-600" aria-label="Minskning" />;
    default:
      return <Minus className="w-4 h-4 text-gray-400" aria-label="Oförändrad" />;
  }
};

const getChangeColor = (change: number): string => {
  const type = getChangeType(change);
  switch (type) {
    case "positive":
      return "text-green-600";
    case "negative":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
};

const calculateProblemChanges = (
  currentProblems: ScoreBatchResponse[],
  initialProblems: ScoreBatchResponse[]
): ProblemChange[] => {
  return currentProblems
    .map((current) => {
      const initial = initialProblems.find((p) => p.problem_no === current.problem_no);
      if (!initial) return null;

      const attemptsChange = current.score.attempts_total - initial.score.attempts_total;
      const bonusChange =
        Number(current.score.attempts_to_bonus > 0) - Number(initial.score.attempts_to_bonus > 0);
      const topChange =
        Number(current.score.attempts_to_top > 0) - Number(initial.score.attempts_to_top > 0);

      const hasChanges = attemptsChange !== 0 || bonusChange !== 0 || topChange !== 0;

      if (!hasChanges) return null;

      return {
        problemNo: current.problem_no,
        attemptsChange,
        bonusChange,
        topChange,
        current: current.score,
        initial: initial.score,
      };
    })
    .filter((item): item is ProblemChange => item !== null);
};

interface ChangeDetailProps {
  change: ProblemChange;
}

function ChangeDetail({ change }: ChangeDetailProps) {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      {change.attemptsChange !== 0 && (
        <div className="flex items-center gap-1">
          {getChangeIcon(change.attemptsChange)}
          <span className={getChangeColor(change.attemptsChange)}>
            Försök: {change.initial.attempts_total} → {change.current.attempts_total}
          </span>
        </div>
      )}

      {change.bonusChange !== 0 && (
        <div className="flex items-center gap-1">
          {getChangeIcon(change.bonusChange)}
          <span className={getChangeColor(change.bonusChange)}>
            {change.bonusChange > 0 ? "Bonus uppnådd" : "Bonus borttagen"}
          </span>
        </div>
      )}

      {change.topChange !== 0 && (
        <div className="flex items-center gap-1">
          {getChangeIcon(change.topChange)}
          <span className={getChangeColor(change.topChange)}>
            {change.topChange > 0 ? "Topp uppnådd" : "Topp borttagen"}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ScoreHistory({ currentProblems, initialProblems }: ScoreHistoryProps) {
  const changes = useMemo(
    () => calculateProblemChanges(currentProblems, initialProblems),
    [currentProblems, initialProblems]
  );

  if (changes.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/90 backdrop-blur p-6 rounded-lg shadow-md mb-6">
      <header className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Osparade ändringar</h3>
        <span className="text-sm text-gray-600 bg-yellow-100 px-3 py-1 rounded-full">
          {changes.length} {changes.length === 1 ? "ändring" : "ändringar"}
        </span>
      </header>

      <div className="space-y-3">
        {changes.map((change) => (
          <div
            key={change.problemNo}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg gap-2"
          >
            <span className="font-semibold text-gray-800">Problem {change.problemNo}</span>
            <ChangeDetail change={change} />
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Dessa ändringar har inte sparats ännu. Klicka på &quot;Spara alla ändringar&quot; eller
        spara varje problem individuellt.
      </p>
    </div>
  );
}
