import { useState, useEffect, useCallback } from "react";
import { Spinner } from "@radix-ui/themes";
import {
  checkRegistration,
  getCompetitions,
  getCompRegistrationInfo,
  getMyInfo,
} from "@/services/api";
import { CompetitionResponse, MessageProps } from "@/types";
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
        setCurrentUserName(userInfo.username);
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
          return regInfo?.approved ? { competition: comp, registrationInfo: regInfo } : null;
        })
      );

      // Filter approved competitions and find the nearest future competition
      // Keep only approved competitions
      const approvedCompetitions = registrationChecks
        .filter((result) => result.status === "fulfilled" && result.value)
        .map(
          (result) =>
            (
              result as PromiseFulfilledResult<{
                competition: CompetitionResponse;
                registrationInfo: { approved: boolean };
              }>
            ).value.competition
        );

      // Normalize today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Split into today and future
      const todayComps = approvedCompetitions.filter((comp) => {
        const d = new Date(comp.comp_date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });

      const futureComps = approvedCompetitions.filter((comp) => {
        const d = new Date(comp.comp_date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() > today.getTime();
      });

      // Sort by date ascending
      todayComps.sort((a, b) => new Date(a.comp_date).getTime() - new Date(b.comp_date).getTime());
      futureComps.sort((a, b) => new Date(a.comp_date).getTime() - new Date(b.comp_date).getTime());

      // Pick competition: today first, otherwise nearest future
      const selectedCompetition = todayComps[0] ?? futureComps[0] ?? null;

      setActiveCompetition(selectedCompetition);
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
        <div>
          <p className="text-center text-gray-600">
            Just nu har du inga aktiva tävlingar. Om du har anmält dig och betalat tävlingen kommer
            du att bli godkänd på tävlingsdagen.
          </p>
          <p className="text-center text-gray-600">Kontakta receptionen för mer information.</p>
        </div>
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
