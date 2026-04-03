import { useEffect, useRef, useState } from "react";
import { Spinner } from "@radix-ui/themes";
import { getSeasons, getSeasonStandings } from "@/services/api";
import type { SeasonResponse, SeasonStandingsResponse } from "@/types";
import { getGradeColor } from "@/constants/gradeColors";

export function SeasonStandings() {
  const [seasons, setSeasons] = useState<SeasonResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [standings, setStandings] = useState<SeasonStandingsResponse | null>(null);
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSeasons()
      .then((data) => setSeasons(data ?? []))
      .catch(() => setError("Kunde inte hämta säsonger."))
      .finally(() => setLoadingSeasons(false));
  }, []);

  const fetchRef = useRef(0);

  useEffect(() => {
    if (selectedId === null) return;
    const token = ++fetchRef.current;
    setLoadingStandings(true);
    setStandings(null);
    setActiveLevel(null);
    setError(null);
    getSeasonStandings(selectedId)
      .then((data) => {
        if (token !== fetchRef.current) return;
        if (!data) return;
        setStandings(data);
        if (data.levels.length > 0) setActiveLevel(data.levels[0].level);
      })
      .catch(() => {
        if (token !== fetchRef.current) return;
        setError("Kunde inte hämta säsongsresultat.");
      })
      .finally(() => {
        if (token !== fetchRef.current) return;
        setLoadingStandings(false);
      });
  }, [selectedId]);

  const activeLevelData = standings?.levels.find((l) => l.level === activeLevel);

  return (
    <div className="space-y-4">
      {loadingSeasons ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Spinner size="2" /> Laddar säsonger...
        </div>
      ) : (
        <select
          className="w-full p-2 rounded-lg border text-base focus:outline-none focus:ring-2 focus:ring-[--secondary-color]"
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Välj säsong...</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.year})
            </option>
          ))}
        </select>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {loadingStandings && (
        <div className="flex items-center gap-2 text-gray-500">
          <Spinner size="2" /> Laddar resultat...
        </div>
      )}

      {standings && !loadingStandings && (
        <>
          {standings.levels.length === 0 ? (
            <p className="text-gray-500 text-sm">Inga godkända resultat för denna säsong.</p>
          ) : (
            <>
              {/* Level tabs */}
              <div className="flex flex-wrap gap-2">
                {standings.levels.map((l) => (
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
                        <th className="px-4 py-3 text-right">Totalpoäng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeLevelData.entries.map((entry, i) => (
                        <tr key={i} className={entry.rank <= 3 ? "bg-amber-50" : "bg-white"}>
                          <td className="px-4 py-3 font-semibold text-gray-500">
                            {entry.rank === 1
                              ? "🥇"
                              : entry.rank === 2
                                ? "🥈"
                                : entry.rank === 3
                                  ? "🥉"
                                  : entry.rank}
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
