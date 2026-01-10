import { useMemo } from "react";
import { ScoreBatchResponse } from "@/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ScoreHistoryProps {
  currentProblems: ScoreBatchResponse[];
  initialProblems: ScoreBatchResponse[];
}

export default function ScoreHistory({ currentProblems, initialProblems }: ScoreHistoryProps) {
  const changes = useMemo(() => {
    const changedProblems = currentProblems
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
      .filter((item) => item !== null);

    return changedProblems;
  }, [currentProblems, initialProblems]);

  if (changes.length === 0) {
    return null;
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <div className="bg-white/90 backdrop-blur p-6 rounded-lg shadow-md mb-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Osparade ändringar</h3>

      <div className="space-y-3">
        {changes.map((change) => (
          <div
            key={change.problemNo}
            className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-800">Problem {change.problemNo}</span>
            </div>

            <div className="flex gap-6 text-sm">
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
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Dessa ändringar har inte sparats ännu. Klicka på "Spara alla ändringar" eller spara varje
        problem individuellt.
      </p>
    </div>
  );
}
