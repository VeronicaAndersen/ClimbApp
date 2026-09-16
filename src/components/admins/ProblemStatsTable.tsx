import { useState, useEffect, useCallback } from "react";
import { Spinner } from "@radix-ui/themes";
import { getLevelStats } from "@/services/api";
import { LevelStatsResponse } from "@/types";
import CalloutMessage from "../user_feedback/CalloutMessage";

interface ProblemStatsTableProps {
  comp_id: number;
  level: number;
  refreshKey?: number;
}

export function ProblemStatsTable({ comp_id, level, refreshKey }: ProblemStatsTableProps) {
  const [stats, setStats] = useState<LevelStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="mb-6 h-fit flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-center mb-4">Problemstatistik - Nivå {level}</h2>

      {error && <CalloutMessage message={error} color="red" />}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="3" />
          <span className="ml-2">Hämtar statistik...</span>
        </div>
      ) : stats && stats.problems.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left p-2 font-semibold text-gray-700">Problem</th>
                <th className="text-center p-2 font-semibold text-gray-700">Totalt deltagare</th>
                <th className="text-center p-2 font-semibold text-gray-700">Topp</th>
                <th className="text-center p-2 font-semibold text-gray-700">Topp %</th>
                <th className="text-center p-2 font-semibold text-gray-700">Bonus</th>
                <th className="text-center p-2 font-semibold text-gray-700">Bonus %</th>
              </tr>
            </thead>

            <tbody>
              {stats.problems.map((problem) => (
                <tr key={problem.problem_no} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-2 text-gray-800 font-medium">{problem.problem_no}</td>
                  <td className="p-2 text-center text-gray-800">{problem.total_competitors}</td>
                  <td className="p-2 text-center text-gray-800">{problem.got_top_count}</td>
                  <td className="p-2 text-center text-gray-800">{problem.got_top_percentage}%</td>
                  <td className="p-2 text-center text-gray-800">{problem.got_bonus_count}</td>
                  <td className="p-2 text-center text-gray-800">{problem.got_bonus_percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-500 py-4">Ingen statistik tillgänglig.</p>
      )}
    </div>
  );
}
