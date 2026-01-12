import { useCompetitions } from "@/hooks/useCompetitions";
import { CompetitionResponse, RegisterToCompResponse } from "@/types";
import { Spinner } from "@radix-ui/themes";
import RegisterToCompForm from "./forms/RegisterToCompForm";
import CalloutMessage from "./user_feedback/CalloutMessage";
import { getCompRegistrationInfo } from "@/services/api";
import { useState, useEffect } from "react";

export function AssignToCompetitionsList() {
  const {
    competitions: competitionList,
    loading,
    error,
    registrationStatus,
    checkingRegistration,
    refreshRegistrationStatus,
  } = useCompetitions();

  const [registrationDetails, setRegistrationDetails] = useState<
    Record<number, RegisterToCompResponse>
  >({});

  const isRegistered = (id: number) => registrationStatus[id] === true;
  const isChecking = (id: number) => checkingRegistration[id] === true;

  // Fetch registration details for registered competitions
  useEffect(() => {
    const fetchRegistrationDetails = async () => {
      for (const comp of competitionList) {
        if (isRegistered(comp.id) && !registrationDetails[comp.id]) {
          try {
            const regInfo = await getCompRegistrationInfo(comp.id);
            if (regInfo) {
              setRegistrationDetails((prev) => ({ ...prev, [comp.id]: regInfo }));
            }
          } catch (err) {
            console.error("Failed to fetch registration details for comp:", comp.id);
          }
        }
      }
    };

    if (competitionList.length > 0) {
      fetchRegistrationDetails();
    }
  }, [competitionList, registrationStatus]);

  const renderCompetition = (comp: CompetitionResponse) => {
    const registered = isRegistered(comp.id);
    const checking = isChecking(comp.id);
    const regDetails = registrationDetails[comp.id];

    return (
      <li key={comp.id} className="m-2 p-4 border border-gray-300 rounded-lg flex flex-col">
        <p>
          <b>{comp.name}</b> — {comp.comp_date}
        </p>

        {checking ? (
          <div className="flex items-center py-2">
            <Spinner size="2" />
            <span className="ml-2 text-sm">Kontrollerar registrering...</span>
          </div>
        ) : registered ? (
          <div>
            {regDetails?.approved ? (
              <p className="text-sm text-green-600 mb-2">
                ✓ Du är registrerad och godkänd för denna tävling
              </p>
            ) : (
              <p className="text-sm text-amber-600 mb-2">
                ⏳ Du är registrerad men väntar på godkännande. Kontakta receptionen då de måste
                godkänna dinregistrering och betalning innan du får tillgång till tävlingen.
              </p>
            )}
          </div>
        ) : (
          <RegisterToCompForm
            {...comp}
            onRegistrationSuccess={() => refreshRegistrationStatus(comp.id)}
          />
        )}
      </li>
    );
  };

  return (
    <div className="mb-6 flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Tävlingar</h2>

      {error && <CalloutMessage message={error} color="red" />}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="3" />
          <span className="ml-2">Hämtar tävlingar...</span>
        </div>
      ) : competitionList.length > 0 ? (
        <ul className="space-y-4">{competitionList.map(renderCompetition)}</ul>
      ) : (
        <p>Inga tävlingar tillgängliga.</p>
      )}
    </div>
  );
}
