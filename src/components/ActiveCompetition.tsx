import { useState, useEffect } from "react";
import { Spinner } from "@radix-ui/themes";
import { checkRegistration, getCompetitions, getCompRegistrationInfo } from "@/services/api";
import { CompetitionResponse, MessageProps, RegisterToCompResponse } from "@/types";
import CalloutMessage from "./user_feedback/CalloutMessage";
import CompetitionScores from "./CompetitionScores";

export function ActiveCompetition() {
  const [activeCompetition, setActiveCompetition] = useState<CompetitionResponse | null>(null);
  const [messageInfo, setMessageInfo] = useState<MessageProps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchActiveCompetition() {
      setLoading(true);

      try {
        const competitions = await getCompetitions();

        if (!Array.isArray(competitions) || competitions.length === 0) {
          setActiveCompetition(null);
          setLoading(false);
          return;
        }

        let best: {
          competition: CompetitionResponse;
          registrationInfo: RegisterToCompResponse;
        } | null = null;

        for (const comp of competitions) {
          try {
            const isRegistered = await checkRegistration(comp.id);
            if (isRegistered) {
              const regInfo = await getCompRegistrationInfo(comp.id);
              if (regInfo) {
                if (
                  !best ||
                  new Date(comp.comp_date).getTime() >
                    new Date(best.competition.comp_date).getTime()
                ) {
                  best = { competition: comp, registrationInfo: regInfo };
                }
              }
            }
          } catch (e) {
            console.error("Registration error on comp:", comp.id, e);
          }
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
    }

    fetchActiveCompetition();
  }, []);

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

  if (!activeCompetition) {
    return (
      <div className="flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-center mb-4">Aktiv Tävling</h2>
        {messageInfo && <CalloutMessage message={messageInfo.message} color={messageInfo.color} />}
        <p className="text-center text-gray-600">Du är inte registrerad för någon tävling ännu.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-center mb-4">Aktiv Tävling</h2>

      {messageInfo && <CalloutMessage message={messageInfo.message} color={messageInfo.color} />}

      <div className="mb-4 p-4 border border-gray-300 rounded-lg">
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

      <CompetitionScores competitionId={activeCompetition.id} />
    </div>
  );
}
