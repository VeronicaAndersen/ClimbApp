import { useState, useEffect, useCallback } from "react";
import { Spinner } from "@radix-ui/themes";
import {
  checkRegistration,
  getCompetitions,
  getCompRegistrationInfo,
  getMyInfo,
  updateRegistrationLevel,
} from "@/services/api";
import { CompetitionResponse, MessageProps } from "@/types";
import CalloutMessage from "./user_feedback/CalloutMessage";
import CompetitionScores from "./CompetitionScores";
import { GRADE_COLORS } from "@/constants/gradeColors";

const LEVEL_NAMES: Record<number, string> = {
  1: "Lila",
  2: "Rosa",
  3: "Orange",
  4: "Gul",
  5: "Grön",
  6: "Vit",
  7: "Svart",
};

export function ActiveCompetition() {
  const [activeCompetition, setActiveCompetition] = useState<CompetitionResponse | null>(null);
  const [messageInfo, setMessageInfo] = useState<MessageProps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userScope, setUserScope] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [isChangingLevel, setIsChangingLevel] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const fetchActiveCompetition = useCallback(async () => {
    setLoading(true);
    setMessageInfo(null);

    try {
      // Fetch user info and competitions in parallel
      const [userInfo, competitions] = await Promise.all([getMyInfo(), getCompetitions()]);

      if (userInfo) {
        setUserScope(userInfo.user_scope);
        setCurrentUserName(userInfo.name);
        setCurrentUserId(userInfo.id);
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

      if (!selectedCompetition) {
        setMessageInfo({
          message:
            "Du har inga godkända tävlingar i framtiden. Kontakta receptionen för mer information.",
          color: "amber",
        });
      }

      setActiveCompetition(selectedCompetition);

      // Get registration info to set current level
      if (selectedCompetition) {
        const regInfo = await getCompRegistrationInfo(selectedCompetition.id);
        if (regInfo) {
          setCurrentLevel(regInfo.level);
        }
      }
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

  const handleLevelChange = async (newLevel: number) => {
    if (!activeCompetition || !currentUserId || currentLevel === newLevel) {
      return;
    }

    setIsChangingLevel(true);
    setMessageInfo(null);

    try {
      await updateRegistrationLevel(activeCompetition.id, currentUserId, newLevel);
      setCurrentLevel(newLevel);
      setRefreshTrigger((prev) => prev + 1);
      setMessageInfo({
        message: `Nivån har uppdaterats till ${LEVEL_NAMES[newLevel]}. Dina poäng följer med till den nya nivån.`,
        color: "green",
      });
    } catch (error) {
      console.error("Error updating level:", error);
      setMessageInfo({
        message: "Ett fel uppstod vid ändring av nivå. Försök igen senare.",
        color: "red",
      });
    } finally {
      setIsChangingLevel(false);
    }
  };

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

            {currentLevel !== null && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h3 className="text-xl font-semibold mb-2">Byte av nivå</h3>
                <div className="flex items-center gap-3">
                  <label htmlFor="level-select" className="text-gray-700 font-medium">
                    Din nivå:
                  </label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full border border-gray-400"
                      style={{ backgroundColor: GRADE_COLORS[currentLevel] }}
                    />
                    <select
                      id="level-select"
                      value={currentLevel}
                      onChange={(e) => handleLevelChange(Number(e.target.value))}
                      disabled={isChangingLevel}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((level) => (
                        <option key={level} value={level}>
                          {LEVEL_NAMES[level]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {isChangingLevel && <Spinner size="2" />}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Obs: Dina poäng följer med när du byter nivå.
                </p>
              </div>
            )}
          </div>

          {isChangingLevel ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="3" />
              <span className="ml-2">Uppdaterar nivå...</span>
            </div>
          ) : (
            <CompetitionScores
              competitionId={activeCompetition.id}
              competitionDate={activeCompetition.comp_date}
              userScope={userScope}
              viewingClimberName={currentUserName}
              refreshTrigger={refreshTrigger}
              overrideLevel={currentLevel}
            />
          )}
        </>
      )}
    </div>
  );
}
