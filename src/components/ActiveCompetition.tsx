import { useState, useEffect, useCallback } from "react";
import { Spinner, TextField, Button } from "@radix-ui/themes";
import { Users, X } from "lucide-react";
import {
  checkRegistration,
  getCompetitions,
  getCompRegistrationInfo,
  getMyInfo,
  getClimberById,
} from "@/services/api";
import { CompetitionResponse, MessageProps, RegisterToCompResponse } from "@/types";
import CalloutMessage from "./user_feedback/CalloutMessage";
import CompetitionScores from "./CompetitionScores";

const RECENT_CLIMBERS_KEY = "recentClimberIds";

export function ActiveCompetition() {
  const [activeCompetition, setActiveCompetition] = useState<CompetitionResponse | null>(null);
  const [messageInfo, setMessageInfo] = useState<MessageProps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userScope, setUserScope] = useState<string>("");
  const [viewingClimberId, setViewingClimberId] = useState<number | null>(null);
  const [viewingClimberName, setViewingClimberName] = useState<string>("");
  const [climberIdInput, setClimberIdInput] = useState<string>("");
  const [recentClimberIds, setRecentClimberIds] = useState<number[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Load recent climber IDs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_CLIMBERS_KEY);
    if (stored) {
      try {
        setRecentClimberIds(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recent climbers", e);
      }
    }
  }, []);

  // Save recent climber IDs to localStorage
  const saveRecentClimber = useCallback((climberId: number) => {
    setRecentClimberIds((prev) => {
      const updated = [climberId, ...prev.filter((id) => id !== climberId)].slice(0, 5);
      localStorage.setItem(RECENT_CLIMBERS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const fetchActiveCompetitionForClimber = useCallback(
    async (climberId: number | null) => {
      setLoading(true);
      setMessageInfo(null);

      try {
        // Fetch user info to get user scope
        const userInfo = await getMyInfo();
        if (userInfo) {
          setUserScope(userInfo.user_scope);
          setCurrentUserId(userInfo.id);
        }

        // If viewing another climber, fetch their info
        if (climberId && climberId !== userInfo?.id) {
          try {
            const climberData = (await getClimberById(climberId)) as { id: number; name: string };
            setViewingClimberName(climberData.name);
            saveRecentClimber(climberId);
          } catch {
            setMessageInfo({
              message: `Kunde inte hitta klättrare med ID ${climberId}.`,
              color: "red",
            });
            setLoading(false);
            return;
          }
        } else {
          setViewingClimberName("");
        }

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
                // Only include competitions where registration is approved
                if (regInfo.approved) {
                  if (
                    !best ||
                    new Date(comp.comp_date).getTime() >
                      new Date(best.competition.comp_date).getTime()
                  ) {
                    best = { competition: comp, registrationInfo: regInfo };
                  }
                } else if (!best && !climberId) {
                  // Show pending message if no approved competitions found (only for current user)
                  setMessageInfo({
                    message:
                      "Din registrering väntar på godkännande. Du får tillgång till tävlingen när en admin har godkänt din registrering och betalning.",
                    color: "amber",
                  });
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
    },
    [saveRecentClimber]
  );

  useEffect(() => {
    fetchActiveCompetitionForClimber(viewingClimberId);
  }, [viewingClimberId, fetchActiveCompetitionForClimber]);

  const handleViewClimber = () => {
    const id = parseInt(climberIdInput);
    if (!isNaN(id) && id > 0) {
      setViewingClimberId(id);
      setClimberIdInput("");
    }
  };

  const handleViewSelf = () => {
    setViewingClimberId(null);
    setViewingClimberName("");
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

  const isViewingOther = viewingClimberId && viewingClimberName;

  return (
    <div className={`flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md`}>
      <div className="flex items-center justify-center gap-2 mb-4">
        <h2 className="text-2xl font-semibold text-center">Aktiv Tävling</h2>
        {isViewingOther && (
          <p className="text-sm text-[#505654] outline px-3 py-1 rounded-full font-medium">
            Visar {viewingClimberName}
          </p>
        )}
      </div>

      {/* Climber selector */}
      <div className="mb-4 p-4 bg-white/70 border border-gray-300 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">Visa klättrare</h3>
        </div>

        {viewingClimberId && viewingClimberName && (
          <div className="mb-3 p-3 rounded-lg flex items-center justify-between shadow-md bg-[#c6d1b8]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800">
                Visar: <strong className="text-[#383d38]">{viewingClimberName}</strong> (ID:{" "}
                {viewingClimberId})
              </span>
            </div>
            <Button
              size="2"
              variant="soft"
              onClick={handleViewSelf}
              className="cursor-pointer bg-[#383d38] hover:bg-[#7b8579] text-white text-xs"
            >
              <X className="w-4 h-4" />
              Visa mig
            </Button>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <TextField.Root
            placeholder="Ange klättrar-ID"
            value={climberIdInput}
            onChange={(e) => setClimberIdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleViewClimber();
              }
            }}
            type="number"
            className="flex-1 min-w-[150px]"
          />
          <Button
            onClick={handleViewClimber}
            disabled={!climberIdInput}
            className="bg-[#505654] hover:bg-[#7b8579] text-white cursor-pointer disabled:opacity-50"
          >
            Visa
          </Button>
        </div>

        {recentClimberIds.length > 0 && !viewingClimberId && (
          <div className="mt-3">
            <p className="text-xs text-gray-600 mb-2">Senast visade:</p>
            <div className="flex gap-2 flex-wrap">
              {recentClimberIds
                .filter((id) => id !== currentUserId)
                .map((id) => (
                  <Button
                    key={id}
                    size="1"
                    variant="soft"
                    onClick={() => setViewingClimberId(id)}
                    className="cursor-pointer text-xs"
                  >
                    ID: {id}
                  </Button>
                ))}
            </div>
          </div>
        )}
      </div>

      {messageInfo && <CalloutMessage message={messageInfo.message} color={messageInfo.color} />}

      {!activeCompetition ? (
        <p className="text-center text-gray-600">
          {viewingClimberName
            ? `${viewingClimberName} är inte registrerad för någon tävling ännu.`
            : "Du är inte registrerad för någon tävling ännu."}
        </p>
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
          />
        </>
      )}
    </div>
  );
}
