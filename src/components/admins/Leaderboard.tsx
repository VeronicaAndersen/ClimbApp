import { useEffect, useState } from "react";
import { Spinner } from "@radix-ui/themes";
import { getCompetitions, getLeaderboard } from "@/services/api";
import type { CompetitionResponse, LeaderboardResponse } from "@/types";
import { getGradeColor } from "@/constants/gradeColors";

export function Leaderboard() {
  const [competitions, setCompetitions] = useState<CompetitionResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [loadingComps, setLoadingComps] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCompetitions()
      .then((data) => {
        setCompetitions(data ?? []);
      })
      .catch(() => setError("Kunde inte hämta tävlingar."))
      .finally(() => setLoadingComps(false));
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    setLoadingBoard(true);
    setLeaderboard(null);
    setActiveLevel(null);
    setError(null);
    getLeaderboard(selectedId)
      .then((data) => {
        setLeaderboard(data);
        if (data.levels.length > 0) setActiveLevel(data.levels[0].level);
      })
      .catch(() => setError("Kunde inte hämta resultatlista."))
      .finally(() => setLoadingBoard(false));
  }, [selectedId]);

  const activeLevelData = leaderboard?.levels.find((l) => l.level === activeLevel);

  return (
    <div className="w-full space-y-4">
      <h3 className="text-xl font-semibold text-gray-800">Resultatlista</h3>

      {loadingComps ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Spinner size="2" /> Laddar tävlingar...
        </div>
      ) : (
        <select
          className="border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[--secondary-color]"
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Välj tävling...</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.comp_date})
            </option>
          ))}
        </select>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {loadingBoard && (
        <div className="flex items-center gap-2 text-gray-500">
          <Spinner size="2" /> Laddar resultatlista...
        </div>
      )}

      {leaderboard && !loadingBoard && (
        <>
          {leaderboard.levels.length === 0 ? (
            <p className="text-gray-500 text-sm">Inga godkända resultat för denna tävling.</p>
          ) : (
            <>
              {/* Level tabs */}
              <div className="flex flex-wrap gap-2">
                {leaderboard.levels.map((l) => (
                  <button
                    key={l.level}
                    onClick={() => setActiveLevel(l.level)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeLevel === l.level
                        ? "bg-[--secondary-color] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
                      style={{ backgroundColor: getGradeColor(l.level) }}
                    />
                    Grad {l.level}
                  </button>
                ))}
              </div>

              {/* Table */}
              {activeLevelData && (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 text-left w-16">#</th>
                        <th className="px-4 py-3 text-left">Namn</th>
                        <th className="px-4 py-3 text-right">Poäng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeLevelData.entries.map((entry) => (
                        <tr
                          key={entry.rank}
                          className={entry.rank <= 3 ? "bg-amber-50" : "bg-white"}
                        >
                          <td className="px-4 py-3 font-semibold text-gray-500">
                            {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{entry.name}</td>
                          <td className="px-4 py-3 text-right font-mono text-gray-700">
                            {entry.total_score.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
