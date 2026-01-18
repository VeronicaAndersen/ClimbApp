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

  // Fetch registration details for registered competitions in parallel
  useEffect(() => {
    const fetchRegistrationDetails = async () => {
      const registeredComps = competitionList.filter(
        (comp) => isRegistered(comp.id) && !registrationDetails[comp.id]
      );

      if (registeredComps.length === 0) return;

      const results = await Promise.allSettled(
        registeredComps.map(async (comp) => {
          const regInfo = await getCompRegistrationInfo(comp.id);
          return { id: comp.id, regInfo };
        })
      );

      const newDetails: Record<number, RegisterToCompResponse> = {};
      for (const result of results) {
        if (result.status === "fulfilled" && result.value.regInfo) {
          newDetails[result.value.id] = result.value.regInfo;
        }
      }

      if (Object.keys(newDetails).length > 0) {
        setRegistrationDetails((prev) => ({ ...prev, ...newDetails }));
      }
    };

    if (competitionList.length > 0) {
      fetchRegistrationDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        (() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const upcomingComps = competitionList.filter(
            (comp) => new Date(comp.comp_date) >= today
          );
          const pastComps = competitionList.filter((comp) => new Date(comp.comp_date) < today);

          const sortedUpcoming = [...upcomingComps].sort(
            (a, b) => new Date(a.comp_date).getTime() - new Date(b.comp_date).getTime()
          );
          const sortedPast = [...pastComps].sort(
            (a, b) => new Date(b.comp_date).getTime() - new Date(a.comp_date).getTime()
          );

          return (
            <>
              {sortedUpcoming.length > 0 ? (
                <ul className="space-y-4">{sortedUpcoming.map(renderCompetition)}</ul>
              ) : (
                <p className="text-gray-600 mb-4">Inga kommande tävlingar.</p>
              )}

              {sortedPast.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-lg font-semibold text-gray-700 hover:text-gray-900 p-2 bg-gray-100 rounded">
                    Visa tidigare tävlingar ({sortedPast.length})
                  </summary>
                  <ul className="space-y-4 mt-2">{sortedPast.map(renderCompetition)}</ul>
                </details>
              )}
            </>
          );
        })()
      ) : (
        <p>Inga tävlingar tillgängliga.</p>
      )}
    </div>
  );
}
