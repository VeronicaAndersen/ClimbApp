import { useState, useEffect } from "react";
import { CompetitionResponse } from "@/types";
import { Leaderboard } from "./Leaderboard";
import { Spinner, Select } from "@radix-ui/themes";
import { getCompetitions } from "@/services/api";
import CalloutMessage from "./user_feedback/CalloutMessage";

const GRADE_LEVELS = [1, 2, 3, 4, 5, 6, 7];

export function AllLeaderboards() {
  const [competitions, setCompetitions] = useState<CompetitionResponse[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompetitions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCompetitions();
        setCompetitions(data || []);
        // Auto-select the most recent competition
        if (data && data.length > 0) {
          // Sort by date descending and pick the most recent
          const sorted = [...data].sort(
            (a, b) => new Date(b.comp_date).getTime() - new Date(a.comp_date).getTime()
          );
          setSelectedCompId(sorted[0].id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Kunde inte hämta tävlingar.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitions();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-center mb-4">Topplistor</h2>
        <div className="flex items-center justify-center py-8">
          <Spinner size="3" />
          <span className="ml-2">Hämtar tävlingar...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-center mb-4">Topplistor</h2>
        <CalloutMessage message={error} color="red" />
      </div>
    );
  }

  if (competitions.length === 0) {
    return (
      <div className="flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-center mb-4">Topplistor</h2>
        <p className="text-center text-gray-500 py-4">Inga tävlingar tillgängliga ännu.</p>
      </div>
    );
  }

  const selectedComp = competitions.find((c) => c.id === selectedCompId);

  return (
    <div className="flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-center mb-4">Topplistor</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Välj tävling:</label>
        <Select.Root
          value={selectedCompId?.toString()}
          onValueChange={(value) => setSelectedCompId(parseInt(value))}
        >
          <Select.Trigger className="w-full" />
          <Select.Content>
            {competitions.map((comp) => (
              <Select.Item key={comp.id} value={comp.id.toString()}>
                {comp.name} - {comp.comp_date}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>

      {selectedComp && (
        <>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-gray-800">{selectedComp.name}</h3>
            <p className="text-sm text-gray-600">
              {selectedComp.comp_date} • {selectedComp.comp_type}
            </p>
            {selectedComp.description && (
              <p className="text-sm text-gray-600 mt-1">{selectedComp.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GRADE_LEVELS.map((level) => (
              <Leaderboard key={level} competitionId={selectedCompId} level={level} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
