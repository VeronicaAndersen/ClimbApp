import { useMemo } from "react";
import { ScoreBatchResponse } from "@/types";
import { Trophy, Star, Medal, Target, LucideIcon } from "lucide-react";
import { getGradeColor } from "@/constants/gradeColors";

interface ScoreSummaryProps {
  problems: ScoreBatchResponse[];
  gradeLevel?: number | null;
}

interface SummaryStats {
  totalProblems: number;
  problemsWithBonus: number;
  problemsWithTop: number;
  totalAttempts: number;
  averageAttempts: string;
}

interface StatCardConfig {
  icon: LucideIcon;
  label: string;
  value: number | string;
  total?: number;
  color: string;
  bgColor: string;
}

const calculateSummaryStats = (problems: ScoreBatchResponse[]): SummaryStats => {
  const totalProblems = problems.length;
  const problemsWithBonus = problems.filter((p) => p.score.attempts_to_bonus > 0).length;
  const problemsWithTop = problems.filter((p) => p.score.attempts_to_top > 0).length;
  const totalAttempts = problems.reduce((sum, p) => sum + p.score.attempts_total, 0);

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
};

const createStatCards = (summary: SummaryStats): StatCardConfig[] => [
  {
    icon: Trophy,
    label: "Toppar",
    value: summary.problemsWithTop,
    total: summary.totalProblems,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
  },
  {
    icon: Star,
    label: "Bonusar",
    value: summary.problemsWithBonus,
    total: summary.totalProblems,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-500/10",
  },
  {
    icon: Target,
    label: "Totala försök",
    value: summary.totalAttempts,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    icon: Medal,
    label: "Snitt försök",
    value: summary.averageAttempts,
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-500/10",
  },
];

interface StatCardProps {
  config: StatCardConfig;
}

function StatCard({ config }: StatCardProps) {
  const { icon: Icon, label, value, total, color, bgColor } = config;
  const progress =
    total !== undefined && total > 0 ? Math.min(100, (Number(value) / total) * 100) : null;

  return (
    <div className={`${bgColor} min-w-0 rounded-xl p-3 sm:p-4 flex flex-col gap-1.5`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className={`size-4 shrink-0 ${color}`} aria-hidden="true" />
        <span className="text-xs font-medium text-muted-foreground leading-tight break-words">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1 tabular-nums">
        <span className={`text-2xl sm:text-3xl font-semibold tracking-tight leading-none ${color}`}>
          {value}
        </span>
        {total !== undefined && <span className="text-sm text-muted-foreground">/ {total}</span>}
      </div>
      {progress !== null && (
        <div className="mt-1 h-1 rounded-full bg-foreground/10 overflow-hidden" aria-hidden="true">
          <div
            className={`h-full rounded-full bg-current ${color} transition-[width] duration-500 ease-out motion-reduce:transition-none`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function ScoreSummary({ problems, gradeLevel }: ScoreSummaryProps) {
  const summary = useMemo(() => calculateSummaryStats(problems), [problems]);
  const statCards = useMemo(() => createStatCards(summary), [summary]);

  const gradeColor = getGradeColor(gradeLevel);
  const gradeLabel = gradeLevel ? `Gradnivå: ${gradeLevel}` : "Gradnivå: ej tilldelad";

  return (
    <div className="bg-card/90 backdrop-blur p-4 sm:p-6 rounded-2xl shadow-soft mb-6 border border-border">
      <header className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
        <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
          Sammanfattning
        </h3>
        {gradeLevel && (
          <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full flex items-center gap-2">
            Nivå:
            <span
              className="w-5 h-5 rounded-full border border-foreground/25"
              style={{ backgroundColor: gradeColor }}
              title={gradeLabel}
            />
          </span>
        )}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {statCards.map((config) => (
          <StatCard key={config.label} config={config} />
        ))}
      </div>
    </div>
  );
}
