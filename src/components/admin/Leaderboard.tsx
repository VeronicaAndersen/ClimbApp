import { useState } from "react";
import type { LevelLeaderboard } from "@/types";
import { getGradeColor } from "@/constants/gradeColors";
import Loader from "@/components/feedback/Loader";
import { useAllCompetitions } from "@/hooks/useAllCompetitions";
import { useSeasons } from "@/hooks/useSeasons";
import {
  useCompetitionLeaderboard,
  useSeasonStandings,
  type StandingsResult,
} from "@/hooks/useStandings";

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

/** Shows the ranking for one level at a time; defaults to the first level. */
function LevelStandings({
  levels,
  scoreLabel,
}: {
  levels: LevelLeaderboard[];
  scoreLabel: string;
}) {
  const [chosenLevel, setChosenLevel] = useState<number | null>(null);
  const active = levels.find((l) => l.level === chosenLevel) ?? levels[0];

  return (
    <>
      <LevelTabs levels={levels} activeLevel={active.level} onSelect={setChosenLevel} />
      <RankedTable levelData={active} scoreLabel={scoreLabel} />
    </>
  );
}

interface StandingsTexts {
  placeholder: string;
  optionsLoading: string;
  optionsError: string;
  standingsLoading: string;
  standingsError: string;
  empty: string;
  scoreLabel: string;
}

const COMPETITION_TEXTS: StandingsTexts = {
  placeholder: "Välj tävling...",
  optionsLoading: "Laddar tävlingar",
  optionsError: "Kunde inte hämta tävlingar.",
  standingsLoading: "Laddar resultatlista",
  standingsError: "Kunde inte hämta resultatlista.",
  empty: "Inga godkända resultat för denna tävling.",
  scoreLabel: "Poäng",
};

const SEASON_TEXTS: StandingsTexts = {
  placeholder: "Välj säsong...",
  optionsLoading: "Laddar säsonger",
  optionsError: "Kunde inte hämta säsonger.",
  standingsLoading: "Laddar resultat",
  standingsError: "Kunde inte hämta säsongsresultat.",
  empty: "Inga godkända resultat för denna säsong.",
  scoreLabel: "Totalpoäng",
};

/** Select a competition or season, then show its per-level standings. */
function StandingsPanel({
  texts,
  options,
  optionsLoading,
  optionsFailed,
  selectedId,
  onSelect,
  standings,
}: {
  texts: StandingsTexts;
  options: { id: number; label: string }[];
  optionsLoading: boolean;
  optionsFailed: boolean;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  standings: StandingsResult;
}) {
  const { levels, loading, failed } = standings;

  return (
    <div className="space-y-4">
      {optionsLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader label={texts.optionsLoading} size="sm" />
        </div>
      ) : (
        <select
          className="input-base p-2"
          value={selectedId ?? ""}
          onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">{texts.placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {optionsFailed && (
        <p className="text-red-500 dark:text-red-400 text-sm">{texts.optionsError}</p>
      )}
      {failed && <p className="text-red-500 dark:text-red-400 text-sm">{texts.standingsError}</p>}

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader label={texts.standingsLoading} size="sm" />
        </div>
      )}

      {levels &&
        !loading &&
        !failed &&
        (levels.length === 0 ? (
          <p className="text-muted-foreground text-sm">{texts.empty}</p>
        ) : (
          // Keyed so the level tab resets when another selection is shown.
          <LevelStandings key={selectedId} levels={levels} scoreLabel={texts.scoreLabel} />
        ))}
    </div>
  );
}

function CompetitionLeaderboard() {
  const { competitions, loading, error } = useAllCompetitions();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const standings = useCompetitionLeaderboard(selectedId);

  return (
    <StandingsPanel
      texts={COMPETITION_TEXTS}
      options={competitions.map((c) => ({ id: c.id, label: `${c.name} (${c.comp_date})` }))}
      optionsLoading={loading}
      optionsFailed={error !== null}
      selectedId={selectedId}
      onSelect={setSelectedId}
      standings={standings}
    />
  );
}

function SeasonLeaderboard() {
  const { seasons, loading, error } = useSeasons();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const standings = useSeasonStandings(selectedId);

  return (
    <StandingsPanel
      texts={SEASON_TEXTS}
      options={seasons.map((s) => ({ id: s.id, label: `${s.name} (${s.year})` }))}
      optionsLoading={loading}
      optionsFailed={error !== null}
      selectedId={selectedId}
      onSelect={setSelectedId}
      standings={standings}
    />
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
