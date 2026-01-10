import { useMemo } from "react";
import { Trophy, Star, Target, Medal, Calendar, LucideIcon } from "lucide-react";
import { CompetitionWithScores } from "@/hooks/useUserCompetitions";

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

const GRADE_COLORS: Record<number, string> = {
  1: "#C084FC", // Purple
  2: "#F9A8D4", // Pink
  3: "#FDBA74", // Orange
  4: "#FACC15", // Yellow
  5: "#4ADE80", // Green
  6: "#FFFFFF", // White
  7: "#000000", // Black
};

const DEFAULT_GRADE_COLOR = "#D1D5DB";

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
        <span className="text-xs text-gray-600 font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${textColor}`}>{value}</span>
        {total !== undefined && <span className="text-sm text-gray-500">/ {total}</span>}
      </div>
    </div>
  );
}

export default function CompetitionSummaryCard({ competitionData }: CompetitionSummaryCardProps) {
  const { competition, level, summary } = competitionData;

  const gradeColor = GRADE_COLORS[level] ?? DEFAULT_GRADE_COLOR;

  const statCards: StatCardConfig[] = useMemo(
    () => [
      {
        icon: Trophy,
        label: "Toppar",
        value: summary.problemsWithTop,
        total: summary.totalProblems,
        bgColor: "bg-amber-50",
        borderColor: "border-amber-100",
        textColor: "text-amber-600",
      },
      {
        icon: Star,
        label: "Bonusar",
        value: summary.problemsWithBonus,
        total: summary.totalProblems,
        bgColor: "bg-green-50",
        borderColor: "border-green-100",
        textColor: "text-green-600",
      },
      {
        icon: Target,
        label: "Totalt försök",
        value: summary.totalAttempts,
        bgColor: "bg-blue-50",
        borderColor: "border-blue-100",
        textColor: "text-blue-600",
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
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <header className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">{competition.name}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            <time dateTime={competition.comp_date}>{formatDate(competition.comp_date)}</time>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full border-2 border-gray-300"
            style={{ backgroundColor: gradeColor }}
            title={`Gradnivå: ${level}`}
            aria-label={`Gradnivå ${level}`}
          />
          <span className="text-sm font-medium text-gray-700">Nivå {level}</span>
        </div>
      </header>

      {/* Description */}
      {competition.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{competition.description}</p>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((config, index) => (
          <StatCard key={index} config={config} />
        ))}
      </div>
    </div>
  );
}
