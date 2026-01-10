import { useMemo } from "react";
import { ScoreBatchResponse } from "@/types";
import { Trophy, Star, Medal, Target } from "lucide-react";

interface ScoreSummaryProps {
  problems: ScoreBatchResponse[];
  gradeLevel?: number | null;
}

export default function ScoreSummary({ problems, gradeLevel }: ScoreSummaryProps) {
  const summary = useMemo(() => {
    const totalProblems = problems.length;
    const problemsWithBonus = problems.filter((p) => p.score.attempts_to_bonus > 0).length;
    const problemsWithTop = problems.filter((p) => p.score.attempts_to_top > 0).length;
    const totalAttempts = problems.reduce((sum, p) => sum + p.score.attempts_total, 0);

    // Calculate average attempts (only for problems attempted)
    const attemptedProblems = problems.filter((p) => p.score.attempts_total > 0).length;
    const averageAttempts =
      attemptedProblems > 0 ? (totalAttempts / attemptedProblems).toFixed(1) : "0";

    return {
      totalProblems,
      problemsWithBonus,
      problemsWithTop,
      totalAttempts,
      averageAttempts,
    };
  }, [problems]);

  const statCards = [
    {
      icon: Trophy,
      label: "Toppar",
      value: summary.problemsWithTop,
      total: summary.totalProblems,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
    },
    {
      icon: Star,
      label: "Bonusar",
      value: summary.problemsWithBonus,
      total: summary.totalProblems,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      icon: Target,
      label: "Totala försök",
      value: summary.totalAttempts,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      icon: Medal,
      label: "Genomsnittliga försök",
      value: summary.averageAttempts,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="bg-white/90 backdrop-blur p-6 rounded-lg shadow-md mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Sammanfattning</h3>
        {gradeLevel && (
          <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            Gradnivå: {gradeLevel}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`${stat.bgColor} p-4 rounded-lg border border-gray-200 transition-transform hover:scale-105`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-sm text-gray-600 font-medium">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                {stat.total !== undefined && (
                  <span className="text-sm text-gray-500">/ {stat.total}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
