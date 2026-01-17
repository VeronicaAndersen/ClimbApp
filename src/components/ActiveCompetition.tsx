import { useState, useEffect, useCallback } from "react";
import { Spinner } from "@radix-ui/themes";
import {
  checkRegistration,
  getCompetitions,
  getCompRegistrationInfo,
  getMyInfo,
} from "@/services/api";
import { CompetitionResponse, MessageProps, RegisterToCompResponse } from "@/types";
import CalloutMessage from "./user_feedback/CalloutMessage";
import CompetitionScores from "./CompetitionScores";

export function ActiveCompetition() {
  const [activeCompetition, setActiveCompetition] = useState<CompetitionResponse | null>(null);
  const [messageInfo, setMessageInfo] = useState<MessageProps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userScope, setUserScope] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");

  const fetchActiveCompetition = useCallback(async () => {
    setLoading(true);
    setMessageInfo(null);

    try {
      // Fetch user info and competitions in parallel
      const [userInfo, competitions] = await Promise.all([getMyInfo(), getCompetitions()]);

      if (userInfo) {
        setUserScope(userInfo.user_scope);
        setCurrentUserName(userInfo.name);
      }

      if (!Array.isArray(competitions) || competitions.length === 0) {
        setActiveCompetition(null);
        setLoading(false);
        return;
      }

      // Check all registrations in parallel
      const registrationChecks = await Promise.allSettled(
        competitions.map(async (comp) => {
          const isRegistered = await checkRegistration(comp.id);
          if (!isRegistered) return null;

          const regInfo = await getCompRegistrationInfo(comp.id);
          return regInfo ? { competition: comp, registrationInfo: regInfo } : null;
        })
      );

      let best: {
        competition: CompetitionResponse;
        registrationInfo: RegisterToCompResponse;
      } | null = null;
      let hasPendingRegistration = false;

      for (const result of registrationChecks) {
        if (result.status === "fulfilled" && result.value) {
          const { competition, registrationInfo } = result.value;

          if (registrationInfo.approved) {
            if (
              !best ||
              new Date(competition.comp_date).getTime() >
                new Date(best.competition.comp_date).getTime()
            ) {
              best = { competition, registrationInfo };
            }
          } else {
            hasPendingRegistration = true;
          }
        }
      }

      if (!best && hasPendingRegistration) {
        setMessageInfo({
          message:
            "Din registrering väntar på godkännande. Du får tillgång till tävlingen när en admin har godkänt din registrering och betalning.",
          color: "amber",
        });
      }

      setActiveCompetition(best ? best.competition : null);
    } catch (error) {
      console.error("Error fetching active competition:", error);
      setMessageInfo({
        message: "Ett fel uppstod vid hämtning av aktiv tävling.",
        color: "red",
      });
      setActiveCompetition(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveCompetition();
  }, [fetchActiveCompetition]);

  if (loading) {
    return (
      <div className="flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-center mb-4">Aktiv Tävling</h2>
        <div className="flex items-center justify-center py-8">
          <Spinner size="3" />
          <span className="ml-2">Hämtar aktiv tävling...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-center gap-2 mb-4">
        <h2 className="text-2xl font-semibold text-center">Aktiv Tävling</h2>
      </div>

      {messageInfo && <CalloutMessage message={messageInfo.message} color={messageInfo.color} />}

      {!activeCompetition ? (
        <p className="text-center text-gray-600">Du är inte registrerad för någon tävling ännu.</p>
      ) : (
        <>
          <div className="mb-4 p-4 border border-gray-300 rounded-lg bg-white shadow-sm">
            <h3 className="text-xl font-semibold mb-2">{activeCompetition.name}</h3>

            <p className="text-gray-600 mb-1">
              <strong>Datum:</strong> {activeCompetition.comp_date}
            </p>

            {activeCompetition.description && (
              <p className="text-gray-600 mb-1">
                <strong>Beskrivning:</strong> {activeCompetition.description}
              </p>
            )}
          </div>

          <CompetitionScores
            competitionId={activeCompetition.id}
            competitionDate={activeCompetition.comp_date}
            userScope={userScope}
            viewingClimberName={currentUserName}
          />
        </>
      )}
    </div>
  );
}
