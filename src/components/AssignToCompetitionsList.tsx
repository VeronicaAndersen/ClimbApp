import { useCompetitions } from "@/hooks/useCompetitions";
import { CompetitionResponse, RegisterToCompResponse } from "@/types";
import { Spinner } from "@radix-ui/themes";
import RegisterToCompForm from "./forms/RegisterToCompForm";
import CalloutMessage from "./user_feedback/CalloutMessage";
import { getCompRegistrationInfo } from "@/services/api";
import { useState, useEffect, useMemo } from "react";
import { sortCompetitions } from "@/utils/competitionSort";
import { SessionSwitcher } from "./SessionSwitcher";

export function AssignToCompetitionsList() {
  const {
    competitions: competitionList,
    loading,
    error,
    registrationStatus,
    checkingRegistration,
    refreshRegistrationStatus,
    refetch,
  } = useCompetitions();

  const [registrationDetails, setRegistrationDetails] = useState<
    Record<number, RegisterToCompResponse>
  >({});

  // Fetch registration details for registered competitions
  useEffect(() => {
    const fetchRegistrationDetails = async () => {
      const registeredComps = competitionList.filter(
        (comp) => registrationStatus[comp.id] && !registrationDetails[comp.id]
      );

      if (registeredComps.length === 0) return;

      const results = await Promise.allSettled(
        registeredComps.map(async (comp) => {
          const regInfo = await getCompRegistrationInfo(comp.id);
          return { id: comp.id, regInfo };
        })
      );

      const newDetails: Record<number, RegisterToCompResponse> = {};
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.regInfo) {
          newDetails[result.value.id] = result.value.regInfo;
        }
      });

      if (Object.keys(newDetails).length > 0) {
        setRegistrationDetails((prev) => ({ ...prev, ...newDetails }));
      }
    };

    if (competitionList.length > 0) {
      fetchRegistrationDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionList, registrationStatus]);

  const { upcoming: upcomingCompetitions, past: pastCompetitions } = useMemo(
    () => sortCompetitions(competitionList),
    [competitionList]
  );

  const renderRegistrationStatus = (comp: CompetitionResponse) => {
    const isChecking = checkingRegistration[comp.id];
    const isRegistered = registrationStatus[comp.id];
    const regDetails = registrationDetails[comp.id];

    if (isChecking) {
      return (
        <div className="flex items-center py-2">
          <Spinner size="2" />
          <span className="ml-2 text-sm">Kontrollerar registrering...</span>
        </div>
      );
    }

    if (isRegistered) {
      return (
        <div>
          {regDetails?.approved ? (
            <p className="text-sm text-green-600 mb-2">
              ✓ Du är registrerad och godkänd för denna tävling
            </p>
          ) : (
            <p className="text-sm text-amber-600 mb-2">
              ⏳ Du är registrerad men väntar på godkännande. Kontakta receptionen då de måste
              godkänna din registrering och betalning innan du får tillgång till tävlingen.
            </p>
          )}
        </div>
      );
    }

    return (
      <RegisterToCompForm
        {...comp}
        onRegistrationSuccess={() => refreshRegistrationStatus(comp.id)}
      />
    );
  };

  const renderCompetition = (comp: CompetitionResponse) => (
    <li key={comp.id} className="m-2 p-4 border border-gray-300 rounded-lg flex flex-col">
      <p>
        <b>{comp.name}</b> — {comp.comp_date}
      </p>
      {renderRegistrationStatus(comp)}
    </li>
  );

  if (loading) {
    return (
      <div className="mb-6 flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Tävlingar</h2>
        <div className="flex items-center justify-center py-8">
          <Spinner size="3" />
          <span className="ml-2">Hämtar tävlingar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Tävlingar</h2>
      <SessionSwitcher
        onSwitch={() => {
          setRegistrationDetails({});
          refetch();
        }}
      />

      {error && <CalloutMessage message={error} color="red" />}

      {competitionList.length === 0 ? (
        <p>Inga tävlingar tillgängliga.</p>
      ) : (
        <>
          {upcomingCompetitions.length > 0 ? (
            <ul className="space-y-4">{upcomingCompetitions.map(renderCompetition)}</ul>
          ) : (
            <p className="text-gray-600 mb-4">Inga kommande tävlingar.</p>
          )}

          {pastCompetitions.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-lg font-semibold text-gray-700 hover:text-gray-900 p-2 bg-gray-100 rounded">
                Visa tidigare tävlingar ({pastCompetitions.length})
              </summary>
              <ul className="space-y-4 mt-2">{pastCompetitions.map(renderCompetition)}</ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
