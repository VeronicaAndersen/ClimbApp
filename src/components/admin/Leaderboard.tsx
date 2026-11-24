import { useEffect, useRef, useState } from "react";
import { getCompetitions, getLeaderboard, getSeasons, getSeasonStandings } from "@/services/api";
import type {
  CompetitionResponse,
  LeaderboardResponse,
  LevelLeaderboard,
  SeasonResponse,
  SeasonStandingsResponse,
} from "@/types";
import { getGradeColor } from "@/constants/gradeColors";
import Loader from "@/components/feedback/Loader";

type View = "competition" | "season";

const getRankIcon = (rank: number): string | number => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
};

function LevelTabs({
  levels,
  activeLevel,
  onSelect,
}: {
  levels: LevelLeaderboard[];
  activeLevel: number | null;
  onSelect: (level: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {levels.map((l) => (
        <button
          key={l.level}
          onClick={() => onSelect(l.level)}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeLevel === l.level
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <span
            className="w-4 h-4 rounded-full border border-border shrink-0"
            style={{ backgroundColor: getGradeColor(l.level) }}
          />
          Grad {l.level}
        </button>
      ))}
    </div>
  );
}

function RankedTable({
  levelData,
  scoreLabel,
}: {
  levelData: LevelLeaderboard;
  scoreLabel: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
          <tr>
            <th className="px-4 py-3 text-left w-16">#</th>
            <th className="px-4 py-3 text-left">Namn</th>
            <th className="px-4 py-3 text-right">{scoreLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {levelData.entries.map((entry) => (
            <tr
              key={`${entry.rank}-${entry.name}`}
              className={entry.rank <= 3 ? "bg-amber-50 dark:bg-amber-500/10" : "bg-card"}
            >
              <td className="px-4 py-3 font-semibold text-muted-foreground">
                {getRankIcon(entry.rank)}
              </td>
              <td className="px-4 py-3 font-medium text-foreground">{entry.name}</td>
              <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                {entry.total_score.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompetitionLeaderboard() {
  const [competitions, setCompetitions] = useState<CompetitionResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [loadingComps, setLoadingComps] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCompetitions()
      .then((data) => setCompetitions(data ?? []))
      .catch(() => setError("Kunde inte hämta tävlingar."))
      .finally(() => setLoadingComps(false));
  }, []);

  const fetchRef = useRef(0);

  useEffect(() => {
    if (selectedId === null) return;
    const token = ++fetchRef.current;
    setLoadingBoard(true);
    setLeaderboard(null);
    setActiveLevel(null);
    setError(null);
    getLeaderboard(selectedId)
      .then((data) => {
        if (token !== fetchRef.current) return;
        if (!data) return;
        setLeaderboard(data);
        if (data.levels.length > 0) setActiveLevel(data.levels[0].level);
      })
      .catch(() => {
        if (token !== fetchRef.current) return;
        setError("Kunde inte hämta resultatlista.");
      })
      .finally(() => {
        if (token !== fetchRef.current) return;
        setLoadingBoard(false);
      });
  }, [selectedId]);

  const activeLevelData = leaderboard?.levels.find((l) => l.level === activeLevel);

  return (
    <div className="space-y-4">
      {loadingComps ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader label="Laddar tävlingar" size="sm" />
        </div>
      ) : (
        <select
          className="input-base p-2"
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

      {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}

      {loadingBoard && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader label="Laddar resultatlista" size="sm" />
        </div>
      )}

      {leaderboard && !loadingBoard && (
        <>
          {leaderboard.levels.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Inga godkända resultat för denna tävling.
            </p>
          ) : (
            <>
              <LevelTabs
                levels={leaderboard.levels}
                activeLevel={activeLevel}
                onSelect={setActiveLevel}
              />
              {activeLevelData && <RankedTable levelData={activeLevelData} scoreLabel="Poäng" />}
            </>
          )}
        </>
      )}
    </div>
  );
}

function SeasonLeaderboard() {
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
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader label="Laddar säsonger" size="sm" />
        </div>
      ) : (
        <select
          className="input-base p-2"
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

      {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}

      {loadingStandings && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader label="Laddar resultat" size="sm" />
        </div>
      )}

      {standings && !loadingStandings && (
        <>
          {standings.levels.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Inga godkända resultat för denna säsong.
            </p>
          ) : (
            <>
              <LevelTabs
                levels={standings.levels}
                activeLevel={activeLevel}
                onSelect={setActiveLevel}
              />
              {activeLevelData && (
                <RankedTable levelData={activeLevelData} scoreLabel="Totalpoäng" />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export function Leaderboard() {
  const [view, setView] = useState<View>("competition");

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-foreground">Resultatlista</h3>
        <div className="flex rounded-lg border border-border overflow-hidden text-sm font-medium">
          <button
            onClick={() => setView("competition")}
            className={`px-4 py-1.5 transition-colors ${
              view === "competition"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Tävling
          </button>
          <button
            onClick={() => setView("season")}
            className={`px-4 py-1.5 border-l border-border transition-colors ${
              view === "season"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Säsong
          </button>
        </div>
      </div>

      {view === "competition" ? <CompetitionLeaderboard /> : <SeasonLeaderboard />}
    </div>
  );
}
