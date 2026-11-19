import { useMemo } from "react";
import { Trophy, Star, Target, Medal, Calendar, LucideIcon } from "lucide-react";
import { CompetitionWithScores } from "@/hooks/useUserCompetitions";
import { getGradeColor } from "@/constants/gradeColors";

interface CompetitionSummaryCardProps {
  competitionData: CompetitionWithScores;
}

interface StatCardConfig {
  icon: LucideIcon;
  label: string;
  value: number | string;
  total?: number;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

interface StatCardProps {
  config: StatCardConfig;
}

function StatCard({ config }: StatCardProps) {
  const { icon: Icon, label, value, total, bgColor, borderColor, textColor } = config;

  return (
    <div className={`${bgColor} p-3 rounded-lg border ${borderColor}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${textColor}`} />
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${textColor}`}>{value}</span>
        {total !== undefined && <span className="text-sm text-muted-foreground">/ {total}</span>}
      </div>
    </div>
  );
}

export default function CompetitionSummaryCard({ competitionData }: CompetitionSummaryCardProps) {
  const { competition, level, summary } = competitionData;

  const gradeColor = getGradeColor(level);

  const statCards: StatCardConfig[] = useMemo(
    () => [
      {
        icon: Trophy,
        label: "Toppar",
        value: summary.problemsWithTop,
        total: summary.totalProblems,
        bgColor: "bg-amber-50 dark:bg-amber-500/10",
        borderColor: "border-amber-100 dark:border-amber-500/30",
        textColor: "text-amber-600 dark:text-amber-400",
      },
      {
        icon: Star,
        label: "Bonusar",
        value: summary.problemsWithBonus,
        total: summary.totalProblems,
        bgColor: "bg-green-50 dark:bg-green-500/10",
        borderColor: "border-green-100 dark:border-green-500/30",
        textColor: "text-green-600 dark:text-green-400",
      },
      {
        icon: Target,
        label: "Totalt försök",
        value: summary.totalAttempts,
        bgColor: "bg-blue-50 dark:bg-blue-500/10",
        borderColor: "border-blue-100 dark:border-blue-500/30",
        textColor: "text-blue-600 dark:text-blue-400",
      },
      {
        icon: Medal,
        label: "Snitt försök",
        value: summary.averageAttempts,
        bgColor: "bg-purple-50",
        borderColor: "border-purple-100",
        textColor: "text-purple-600",
      },
    ],
    [summary]
  );

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-soft transition-shadow">
      {/* Header */}
      <header className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">{competition.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            <time dateTime={competition.comp_date}>{formatDate(competition.comp_date)}</time>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full border-2 border-foreground/25"
            style={{ backgroundColor: gradeColor }}
            title={`Gradnivå: ${level}`}
            aria-label={`Gradnivå ${level}`}
          />
          <span className="text-sm font-medium text-muted-foreground">Nivå {level}</span>
        </div>
      </header>

      {/* Description */}
      {competition.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{competition.description}</p>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((config) => (
          <StatCard key={config.label} config={config} />
        ))}
      </div>
    </div>
  );
}
