import { useCompetitions } from "@/hooks/useCompetitions";
import { CompetitionResponse, RegisterToCompResponse } from "@/types";
import { Spinner } from "@radix-ui/themes";
import RegisterToCompForm from "./forms/RegisterToCompForm";
import CalloutMessage from "./user_feedback/CalloutMessage";
import { getCompRegistrationInfo } from "@/services/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { sortCompetitions } from "@/utils/competitionSort";
import { SessionSwitcher } from "./SessionSwitcher";
import { getGradeColor, LEVEL_NAMES } from "@/constants/gradeColors";

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
  const fetchedIdsRef = useRef(new Set<number>());

  // Fetch registration details for registered competitions.
  // Uses a ref to track already-fetched IDs to avoid re-fetching on every render
  // without needing registrationDetails in the deps array (which would cause a loop).
  useEffect(() => {
    if (competitionList.length === 0) return;

    const toFetch = competitionList.filter(
      (comp) => registrationStatus[comp.id] && !fetchedIdsRef.current.has(comp.id)
    );
    if (toFetch.length === 0) return;

    toFetch.forEach((comp) => fetchedIdsRef.current.add(comp.id));

    Promise.allSettled(
      toFetch.map(async (comp) => {
        const regInfo = await getCompRegistrationInfo(comp.id);
        return { id: comp.id, regInfo };
      })
    ).then((results) => {
      const newDetails: Record<number, RegisterToCompResponse> = {};
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.regInfo) {
          newDetails[result.value.id] = result.value.regInfo;
        }
      });
      if (Object.keys(newDetails).length > 0) {
        setRegistrationDetails((prev) => ({ ...prev, ...newDetails }));
      }
    });
  }, [competitionList, registrationStatus]);

  const { upcoming: upcomingCompetitions, past: pastCompetitions } = useMemo(
    () => sortCompetitions(competitionList),
    [competitionList]
  );

  const hasPendingRegistrations = competitionList.some(
    (comp) =>
      registrationStatus[comp.id] &&
      registrationDetails[comp.id] &&
      !registrationDetails[comp.id].approved
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
      const levelName = regDetails?.level ? LEVEL_NAMES[regDetails.level] : null;
      const levelColor = regDetails?.level ? getGradeColor(regDetails.level) : null;

      return (
        <div>
          {regDetails?.approved ? (
            <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
              <span>✓ Registrerad och godkänd</span>
              {levelName && levelColor && (
                <span className="flex items-center gap-1.5 text-gray-600">
                  —
                  <span
                    className="w-3 h-3 rounded-full border border-gray-300 shrink-0"
                    style={{ backgroundColor: levelColor }}
                  />
                  {levelName}
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-600 mb-2">⏳ Väntar på godkännande</p>
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
          fetchedIdsRef.current.clear();
          setRegistrationDetails({});
          refetch();
        }}
      />

      {error && <CalloutMessage message={error} color="red" />}

      {hasPendingRegistrations && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          En eller flera anmälningar väntar på godkännande. Kontakta receptionen för att godkänna
          din registrering och betalning.
        </div>
      )}

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
