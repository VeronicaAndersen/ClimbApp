import { useState, useEffect, useMemo } from "react";
import { CompetitionResponse } from "@/types";
import { getCompetitions } from "@/services/api";
import { CompetitionRegistrations } from "./admins/CompetitionRegistrations";
import { sortCompetitions } from "@/utils/competitionSort";
import { Spinner } from "@radix-ui/themes";

interface CompetitionListSectionProps {
  refreshKey: number;
}

export function CompetitionListSection({ refreshKey }: CompetitionListSectionProps) {
  const [competitions, setCompetitions] = useState<CompetitionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getCompetitions()
      .then((data) => setCompetitions(data ?? []))
      .catch(() => {
        setCompetitions([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [refreshKey, retryCount]);

  const { upcoming, past } = useMemo(() => sortCompetitions(competitions), [competitions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner size="2" />
        <span className="ml-2 text-sm">Hämtar tävlingar...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="mb-4">
        <p className="text-red-600 mb-2">Det gick inte att hämta tävlingar.</p>
        <button
          type="button"
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm"
          onClick={() => setRetryCount((c) => c + 1)}
        >
          Försök igen
        </button>
      </div>
    );
  }

  if (competitions.length === 0) {
    return <p className="text-gray-600 mb-4">Inga tävlingar tillgängliga.</p>;
  }

  return (
    <>
      {upcoming.length > 0 ? (
        upcoming.map((comp) => (
          <CompetitionRegistrations key={comp.id} competition={comp} refreshKey={refreshKey} />
        ))
      ) : (
        <p className="text-gray-600 mb-4">Inga kommande tävlingar.</p>
      )}

      {past.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-lg font-semibold text-gray-700 hover:text-gray-900 p-2 bg-gray-100 rounded">
            Visa tidigare tävlingar ({past.length})
          </summary>
          <div className="mt-2">
            {past.map((comp) => (
              <CompetitionRegistrations key={comp.id} competition={comp} refreshKey={refreshKey} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}
