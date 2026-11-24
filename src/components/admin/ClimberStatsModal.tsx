import { useState } from "react";
import { Dialog } from "@radix-ui/themes";
import { Trophy, Star } from "lucide-react";
import { ClimberResponse } from "@/types";
import CalloutMessage from "../feedback/CalloutMessage";
import ScoreSummary from "../ScoreSummary";
import { getGradeColor, LEVEL_NAMES } from "@/constants/gradeColors";
import Loader from "@/components/feedback/Loader";
import { useClimberRegistrations, useClimberScores } from "@/hooks/useClimberStats";

interface ClimberStatsModalProps {
  climber: ClimberResponse | null;
  onClose: () => void;
}

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("sv-SE");

export function ClimberStatsModal({ climber, onClose }: ClimberStatsModalProps) {
  const climberId = climber?.id ?? null;
  const registrationsQuery = useClimberRegistrations(climberId);
  const registrations = registrationsQuery.data;
  const loadingRegistrations = registrationsQuery.loading;

  // The picked competition belongs to one open of the modal: reopening, or
  // opening another climber, starts at the first registration again.
  const [picked, setPicked] = useState<{ climberId: number; compId: number } | null>(null);
  if (climberId === null && picked !== null) setPicked(null);
  const pickedCompId = picked && picked.climberId === climberId ? picked.compId : null;
  const selectedRegistration =
    registrations.find((r) => r.comp_id === pickedCompId) ?? registrations[0] ?? null;
  const selectedCompId = selectedRegistration?.comp_id ?? null;
  const setSelectedCompId = (compId: number) => {
    if (climberId !== null) setPicked({ climberId, compId });
  };

  const scoresQuery = useClimberScores(climberId, selectedRegistration);
  const scores = scoresQuery.data;
  const loadingScores = scoresQuery.loading;
  const error = registrationsQuery.error ?? scoresQuery.error;

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
            <Loader label="Hämtar tävlingar" />
          </div>
        ) : registrations.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
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
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-input"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-border shrink-0"
                    style={{ backgroundColor: getGradeColor(reg.level) }}
                  />
                  {reg.competition_name} ({formatDate(reg.comp_date)})
                </button>
              ))}
            </div>

            {loadingScores ? (
              <div className="flex items-center justify-center py-8">
                <Loader label="Hämtar poäng" />
              </div>
            ) : selectedRegistration ? (
              <div className="max-h-[70vh] overflow-y-auto">
                <ScoreSummary problems={scores} gradeLevel={selectedRegistration.level} />

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 font-semibold text-muted-foreground">
                          Problem
                        </th>
                        <th className="text-center p-2 font-semibold text-muted-foreground">
                          Försök
                        </th>
                        <th className="text-center p-2 font-semibold text-muted-foreground">
                          Bonus
                        </th>
                        <th className="text-center p-2 font-semibold text-muted-foreground">
                          Topp
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...scores]
                        .sort((a, b) => a.problem_no - b.problem_no)
                        .map((p) => (
                          <tr
                            key={p.problem_no}
                            className="border-b border-border hover:bg-muted/50"
                          >
                            <td className="p-2 text-foreground font-medium">{p.problem_no}</td>
                            <td className="p-2 text-center text-foreground">
                              {p.score.attempts_total}
                            </td>
                            <td className="p-2 text-center text-foreground">
                              {p.score.got_bonus ? (
                                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <Star className="w-4 h-4" /> {p.score.attempts_to_bonus}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="p-2 text-center text-foreground">
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

                <p className="text-sm text-muted-foreground mt-2">
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
