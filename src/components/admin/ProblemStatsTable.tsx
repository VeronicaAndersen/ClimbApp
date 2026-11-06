import { useState, useEffect, useCallback, useMemo } from "react";
import { Spinner } from "@radix-ui/themes";
import { Trophy, Star, Users, LucideIcon } from "lucide-react";
import { getLevelStats } from "@/services/api";
import { LevelStatsResponse, ProblemStats } from "@/types";
import CalloutMessage from "../user_feedback/CalloutMessage";

interface ProblemStatsTableProps {
  comp_id: number;
  level: number;
  refreshKey?: number;
}

type SortMode = "problem_no" | "hardest_top" | "hardest_bonus";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "problem_no", label: "Problemordning" },
  { value: "hardest_top", label: "Svårast (topp)" },
  { value: "hardest_bonus", label: "Svårast (bonus)" },
];

const sortProblems = (problems: ProblemStats[], mode: SortMode): ProblemStats[] => {
  const sorted = [...problems];
  switch (mode) {
    case "hardest_top":
      sorted.sort((a, b) => a.got_top_percentage - b.got_top_percentage);
      break;
    case "hardest_bonus":
      sorted.sort((a, b) => a.got_bonus_percentage - b.got_bonus_percentage);
      break;
    default:
      sorted.sort((a, b) => a.problem_no - b.problem_no);
  }
  return sorted;
};

const getBarColor = (pct: number): string => {
  if (pct < 25) return "bg-red-500";
  if (pct < 50) return "bg-orange-400";
  if (pct < 75) return "bg-yellow-400";
  return "bg-green-500";
};

interface SummaryStats {
  totalParticipants: number;
  avgTopPercentage: number;
  avgBonusPercentage: number;
}

const calculateSummary = (problems: ProblemStats[]): SummaryStats => {
  const totalParticipants = problems[0]?.total_competitors ?? 0;
  const avgTopPercentage = problems.length
    ? problems.reduce((sum, p) => sum + p.got_top_percentage, 0) / problems.length
    : 0;
  const avgBonusPercentage = problems.length
    ? problems.reduce((sum, p) => sum + p.got_bonus_percentage, 0) / problems.length
    : 0;

  return { totalParticipants, avgTopPercentage, avgBonusPercentage };
};

interface SummaryCardConfig {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}

function SummaryCard({ config }: { config: SummaryCardConfig }) {
  const { icon: Icon, label, value, color, bgColor } = config;
  return (
    <div className={`${bgColor} p-4 rounded-lg border border-gray-200`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${color}`} aria-hidden="true" />
        <span className="text-sm text-gray-600 font-medium">{label}</span>
      </div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

function SummaryCards({ problems }: { problems: ProblemStats[] }) {
  const summary = useMemo(() => calculateSummary(problems), [problems]);

  const cards: SummaryCardConfig[] = [
    {
      icon: Users,
      label: "Deltagare",
      value: String(summary.totalParticipants),
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      icon: Trophy,
      label: "Snitt topp",
      value: `${summary.avgTopPercentage.toFixed(0)}%`,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
    },
    {
      icon: Star,
      label: "Snitt bonus",
      value: `${summary.avgBonusPercentage.toFixed(0)}%`,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-4">
      {cards.map((config) => (
        <SummaryCard key={config.label} config={config} />
      ))}
    </div>
  );
}

interface PercentageBarProps {
  count: number;
  percentage: number;
  icon: typeof Trophy;
  iconColor: string;
}

function PercentageBar({ count, percentage, icon: Icon, iconColor }: PercentageBarProps) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-24">
      <span className="flex items-center gap-1 text-sm font-medium text-gray-800">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} aria-hidden="true" />
        {count} <span className="text-gray-500">({percentage}%)</span>
      </span>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getBarColor(percentage)}`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}

export function ProblemStatsTable({ comp_id, level, refreshKey }: ProblemStatsTableProps) {
  const [stats, setStats] = useState<LevelStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("problem_no");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLevelStats({ comp_id, level });
      setStats(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Misslyckades att hämta statistik.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [comp_id, level]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshKey]);

  const sortedProblems = useMemo(
    () => (stats ? sortProblems(stats.problems, sortMode) : []),
    [stats, sortMode]
  );

  return (
    <div className="mb-6 h-fit flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4">
        <h2 className="text-2xl font-semibold text-center">Problemstatistik - Nivå {level}</h2>

        {stats && stats.problems.length > 0 && (
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortMode(opt.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  sortMode === opt.value
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <CalloutMessage message={error} color="red" />}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="3" />
          <span className="ml-2">Hämtar statistik...</span>
        </div>
      ) : stats && stats.problems.length > 0 ? (
        <>
          <SummaryCards problems={stats.problems} />

          {stats.problems[0]?.total_competitors === 0 && (
            <p className="text-center text-gray-500 bg-gray-50 rounded-lg py-3 mb-4">
              Inga deltagare anmälda till denna nivå ännu.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left p-2 font-semibold text-gray-700">Problem</th>
                  <th className="text-center p-2 font-semibold text-gray-700">Deltagare</th>
                  <th className="text-center p-2 font-semibold text-gray-700">Topp</th>
                  <th className="text-center p-2 font-semibold text-gray-700">Bonus</th>
                </tr>
              </thead>

              <tbody>
                {sortedProblems.map((problem) => (
                  <tr
                    key={problem.problem_no}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="p-2 text-gray-800 font-medium">{problem.problem_no}</td>
                    <td className="p-2 text-center text-gray-800">{problem.total_competitors}</td>
                    <td className="p-2">
                      <PercentageBar
                        count={problem.got_top_count}
                        percentage={problem.got_top_percentage}
                        icon={Trophy}
                        iconColor="text-amber-500"
                      />
                    </td>
                    <td className="p-2">
                      <PercentageBar
                        count={problem.got_bonus_count}
                        percentage={problem.got_bonus_percentage}
                        icon={Star}
                        iconColor="text-green-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-center text-gray-500 py-4">Ingen statistik tillgänglig.</p>
      )}
    </div>
  );
}
