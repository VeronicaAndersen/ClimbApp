import { useId, useMemo, useState } from "react";
import { Trophy, Star, Target, Medal, Calendar, ChevronDown, LucideIcon } from "lucide-react";
import { CompetitionWithScores } from "@/hooks/useUserCompetitions";
import { getGradeColor } from "@/constants/gradeColors";
import { SCORE_FIELDS, SCORE_FIELD_LABELS } from "@/utils/problemScore";
import { ScoreBatchResponse } from "@/types";

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

/** Read-only scorecard: one row per problem with the saved attempts. */
function Scorecard({ scores }: { scores: ScoreBatchResponse[] }) {
  const rows = [...scores].sort((a, b) => a.problem_no - b.problem_no);

  return (
    <div className="overflow-hidden rounded-xl bg-muted/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="py-2.5 pl-4 pr-2 text-left font-medium">
              Problem
            </th>
            {SCORE_FIELDS.map((field) => (
              <th key={field} scope="col" className="px-3 py-2.5 text-right font-medium last:pr-4">
                {SCORE_FIELD_LABELS[field]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular divide-y divide-border/60 border-t border-border/60">
          {rows.map(({ problem_no, score }) => (
            <tr key={problem_no}>
              <th scope="row" className="py-3 pl-4 pr-2 text-left font-medium text-foreground">
                {problem_no}
              </th>
              {SCORE_FIELDS.map((field) => (
                <td
                  key={field}
                  className={`px-3 py-3 text-right last:pr-4 ${
                    score[field] > 0 ? "text-foreground" : "text-muted-foreground/40"
                  }`}
                >
                  {score[field] > 0 ? score[field] : "–"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CompetitionSummaryCard({ competitionData }: CompetitionSummaryCardProps) {
  const { competition, level, scores, summary } = competitionData;
  const [showScorecard, setShowScorecard] = useState(false);
  const scorecardId = useId();

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
        bgColor: "bg-purple-50 dark:bg-purple-500/10",
        borderColor: "border-purple-100 dark:border-purple-500/30",
        textColor: "text-purple-600 dark:text-purple-400",
      },
    ],
    [summary]
  );

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm hover:shadow-soft transition-shadow overflow-hidden">
      <div className="p-5">
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
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {competition.description}
          </p>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((config) => (
            <StatCard key={config.label} config={config} />
          ))}
        </div>

        {/* Grows out of the toggle below it, so the content stays tied to its trigger. */}
        <div className="collapsible" data-open={showScorecard}>
          <div
            id={scorecardId}
            aria-hidden={!showScorecard}
            ref={(el) => el?.toggleAttribute("inert", !showScorecard)}
            className={`transition-opacity duration-300 ease-apple ${showScorecard ? "opacity-100" : "opacity-0"}`}
          >
            <div className="pt-4">
              <Scorecard scores={scores} />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowScorecard((open) => !open)}
        aria-expanded={showScorecard}
        aria-controls={scorecardId}
        className="flex w-full items-center justify-center gap-1.5 border-t border-border py-3 text-sm font-medium text-primary transition-colors duration-100 hover:bg-muted/40 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {showScorecard ? "Dölj innehåll" : "Visa innehåll"}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-300 ease-apple ${showScorecard ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
    </div>
  );
}
