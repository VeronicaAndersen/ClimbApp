import { useEffect, useState } from "react";
import { Spinner } from "@radix-ui/themes/components/index";
import { getCompetitions } from "@/services/api";
import type { CompetitionResponse } from "@/types";
import { getGradeColor } from "@/constants/gradeColors";
import { ProblemStatsTable } from "@/components/admin/ProblemStatsTable";

const LEVELS = [1, 2, 3, 4, 5, 6, 7];

/** Admin view: pick a competition and a level to see per-problem statistics. */
export function StatisticsView() {
  const [selectedCompForStats, setSelectedCompForStats] = useState<number | null>(null);
  const [selectedLevelForStats, setSelectedLevelForStats] = useState<number | null>(null);
  const [competitions, setCompetitions] = useState<CompetitionResponse[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(true);

  useEffect(() => {
    const fetchCompetitions = async () => {
      setCompetitionsLoading(true);
      try {
        const comps = await getCompetitions();
        setCompetitions(comps);
      } catch (err) {
        console.error("Failed to fetch competitions:", err);
      } finally {
        setCompetitionsLoading(false);
      }
    };
    void fetchCompetitions();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-2">
      <h3 className="text-xl font-semibold mb-2 text-foreground">Statistik</h3>
      <div className="mb-4 p-4 bg-card/90 backdrop-blur rounded-lg shadow-soft flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Tävling
          </label>
          {competitionsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground p-2.5">
              <Spinner size="2" />
              <span>Hämtar tävlingar...</span>
            </div>
          ) : competitions.length === 0 ? (
            <p className="text-muted-foreground p-2.5">Inga tävlingar tillgängliga.</p>
          ) : (
            <select
              value={selectedCompForStats ?? ""}
              onChange={(e) =>
                setSelectedCompForStats(e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-full p-2.5 rounded-lg border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
            >
              <option value="">Välj tävling...</option>
              {competitions.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} ({comp.comp_date})
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedCompForStats !== null && (
          <div className="flex-1">
            <label className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Nivå
            </label>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevelForStats(level)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all font-medium ${
                    selectedLevelForStats === level
                      ? "shadow-soft"
                      : "border-border text-muted-foreground hover:border-foreground/40"
                  }`}
                  style={{
                    backgroundColor:
                      selectedLevelForStats === level ? getGradeColor(level) : "transparent",
                    color: selectedLevelForStats === level ? "white" : undefined,
                    borderColor: selectedLevelForStats === level ? getGradeColor(level) : undefined,
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-foreground/25 shrink-0"
                    style={{ backgroundColor: getGradeColor(level) }}
                  />
                  Nivå {level}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedCompForStats !== null && selectedLevelForStats !== null ? (
        <ProblemStatsTable comp_id={selectedCompForStats} level={selectedLevelForStats} />
      ) : selectedCompForStats !== null ? (
        <p className="text-center text-muted-foreground bg-card/90 backdrop-blur rounded-lg shadow-soft py-6">
          Välj en nivå ovan för att visa statistik.
        </p>
      ) : (
        !competitionsLoading &&
        competitions.length > 0 && (
          <p className="text-center text-muted-foreground bg-card/90 backdrop-blur rounded-lg shadow-soft py-6">
            Välj en tävling ovan för att visa statistik.
          </p>
        )
      )}
    </div>
  );
}
