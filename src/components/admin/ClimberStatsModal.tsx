import { useState, useEffect, useCallback } from "react";
import { Dialog, Spinner } from "@radix-ui/themes";
import { Trophy, Star } from "lucide-react";
import { getClimberRegistrations, getUserScoresBatch } from "@/services/api";
import { ClimberResponse, RegistrationWithCompetition, ScoreBatchResponse } from "@/types";
import CalloutMessage from "../feedback/CalloutMessage";
import ScoreSummary from "../ScoreSummary";
import { getGradeColor, LEVEL_NAMES } from "@/constants/gradeColors";
import { getUserFriendlyError } from "@/utils/errorMessages";

interface ClimberStatsModalProps {
  climber: ClimberResponse | null;
  onClose: () => void;
}

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("sv-SE");

export function ClimberStatsModal({ climber, onClose }: ClimberStatsModalProps) {
  const [registrations, setRegistrations] = useState<RegistrationWithCompetition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);
  const [scores, setScores] = useState<ScoreBatchResponse[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [loadingScores, setLoadingScores] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRegistration = registrations.find((r) => r.comp_id === selectedCompId) ?? null;

  useEffect(() => {
    if (!climber) return;

    let active = true;
    setLoadingRegistrations(true);
    setError(null);
    setRegistrations([]);
    setSelectedCompId(null);
    setScores([]);

    getClimberRegistrations(climber.id)
      .then((data) => {
        if (!active) return;
        setRegistrations(data);
        setSelectedCompId(data[0]?.comp_id ?? null);
      })
      .catch((err) => {
        if (active) setError(getUserFriendlyError(err));
      })
      .finally(() => {
        if (active) setLoadingRegistrations(false);
      });

    return () => {
      active = false;
    };
  }, [climber]);

  const fetchScores = useCallback(() => {
    if (!climber || !selectedRegistration) return;

    let active = true;
    setLoadingScores(true);
    setError(null);

    getUserScoresBatch(
      { comp_id: selectedRegistration.comp_id, level: selectedRegistration.level },
      climber.id
    )
      .then((data) => {
        if (active) setScores(data);
      })
      .catch((err) => {
        if (active) setError(getUserFriendlyError(err));
      })
      .finally(() => {
        if (active) setLoadingScores(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [climber, selectedRegistration?.comp_id, selectedRegistration?.level]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  return (
    <Dialog.Root open={climber !== null} onOpenChange={handleOpenChange}>
      <Dialog.Content maxWidth="700px">
        <Dialog.Title>{climber ? `Statistik — ${climber.username}` : "Statistik"}</Dialog.Title>
        {climber && (climber.firstname || climber.lastname) && (
          <Dialog.Description size="2" mb="4" color="gray">
            {[climber.firstname, climber.lastname].filter(Boolean).join(" ")}
          </Dialog.Description>
        )}

        {error && <CalloutMessage message={error} color="red" />}

        {loadingRegistrations ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="3" />
            <span className="ml-2">Hämtar tävlingar...</span>
          </div>
        ) : registrations.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            Klättraren är inte anmäld till några tävlingar.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {registrations.map((reg) => (
                <button
                  key={reg.comp_id}
                  onClick={() => setSelectedCompId(reg.comp_id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-all ${
                    selectedCompId === reg.comp_id
                      ? "border-gray-800 bg-[--secondary-color] text-white"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-gray-300 shrink-0"
                    style={{ backgroundColor: getGradeColor(reg.level) }}
                  />
                  {reg.competition_name} ({formatDate(reg.comp_date)})
                </button>
              ))}
            </div>

            {loadingScores ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="3" />
                <span className="ml-2">Hämtar poäng...</span>
              </div>
            ) : selectedRegistration ? (
              <div className="max-h-[70vh] overflow-y-auto">
                <ScoreSummary problems={scores} gradeLevel={selectedRegistration.level} />

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left p-2 font-semibold text-gray-700">Problem</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Försök</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Bonus</th>
                        <th className="text-center p-2 font-semibold text-gray-700">Topp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...scores]
                        .sort((a, b) => a.problem_no - b.problem_no)
                        .map((p) => (
                          <tr
                            key={p.problem_no}
                            className="border-b border-gray-200 hover:bg-gray-50"
                          >
                            <td className="p-2 text-gray-800 font-medium">{p.problem_no}</td>
                            <td className="p-2 text-center text-gray-800">
                              {p.score.attempts_total}
                            </td>
                            <td className="p-2 text-center text-gray-800">
                              {p.score.got_bonus ? (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <Star className="w-4 h-4" /> {p.score.attempts_to_bonus}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="p-2 text-center text-gray-800">
                              {p.score.got_top ? (
                                <span className="inline-flex items-center gap-1 text-amber-500">
                                  <Trophy className="w-4 h-4" /> {p.score.attempts_to_top}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-sm text-gray-500 mt-2">
                  Nivå: {LEVEL_NAMES[selectedRegistration.level] ?? selectedRegistration.level}
                  {selectedRegistration.approved ? "" : " (ej godkänd anmälan)"}
                </p>
              </div>
            ) : null}
          </>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
