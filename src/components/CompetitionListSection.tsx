import { CompetitionResponse } from "@/types";
import { CompetitionRegistrations } from "./admins/CompetitionRegistrations";
import { useMemo } from "react";
import { sortCompetitions } from "@/utils/competitionSort";

interface CompetitionListSectionProps {
  competitions: CompetitionResponse[];
  refreshKey: number;
}

export function CompetitionListSection({ competitions, refreshKey }: CompetitionListSectionProps) {
  const { upcoming, past } = useMemo(() => sortCompetitions(competitions), [competitions]);

  if (!competitions || competitions.length === 0) {
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
