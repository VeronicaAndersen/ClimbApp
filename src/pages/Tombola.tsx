import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Spinner } from "@radix-ui/themes";
import { Trophy, RotateCcw, ArrowLeft, Sparkles } from "lucide-react";
import { getAllRegistrations, getCompetitions } from "@/services/api";
import { RegistrationWithClimber, CompetitionResponse } from "@/types";
import CalloutMessage from "@/components/user_feedback/CalloutMessage";

export default function Tombola() {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<CompetitionResponse[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(null);
  const [allParticipants, setAllParticipants] = useState<RegistrationWithClimber[]>([]);
  const [remainingParticipants, setRemainingParticipants] = useState<RegistrationWithClimber[]>([]);
  const [winners, setWinners] = useState<RegistrationWithClimber[]>([]);
  const [currentWinner, setCurrentWinner] = useState<RegistrationWithClimber | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedCompId = useRef<number | null>(null);
  const storageKey = (compId: number) => `tombola_${compId}`;

  // Fetch competitions on mount
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        setIsLoading(true);
        const comps = await getCompetitions();
        setCompetitions(comps);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunde inte hämta tävlingar");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompetitions();
  }, []);

  // Fetch registrations when competition is selected
  useEffect(() => {
    if (!selectedCompetitionId) return;

    const fetchRegistrations = async () => {
      loadedCompId.current = null;
      try {
        setIsLoading(true);
        setError(null);
        const registrations = await getAllRegistrations(selectedCompetitionId);

        // Filter only approved registrations
        const approvedRegistrations = registrations.filter((reg) => reg.approved);
        setAllParticipants(approvedRegistrations);

        const savedRaw = localStorage.getItem(storageKey(selectedCompetitionId));
        if (savedRaw) {
          try {
            const saved = JSON.parse(savedRaw) as {
              winners: RegistrationWithClimber[];
              remainingParticipants: RegistrationWithClimber[];
            };
            setWinners(saved.winners);
            setRemainingParticipants(saved.remainingParticipants);
          } catch {
            setWinners([]);
            setRemainingParticipants(approvedRegistrations);
          }
        } else {
          setWinners([]);
          setRemainingParticipants(approvedRegistrations);
        }
        setCurrentWinner(null);
        loadedCompId.current = selectedCompetitionId;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunde inte hämta anmälningar");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegistrations();
  }, [selectedCompetitionId]);

  // Persist tombola state to localStorage whenever winners/remaining change
  useEffect(() => {
    if (!selectedCompetitionId || loadedCompId.current !== selectedCompetitionId) return;
    localStorage.setItem(
      storageKey(selectedCompetitionId),
      JSON.stringify({ winners, remainingParticipants })
    );
  }, [winners, remainingParticipants, selectedCompetitionId]);

  const spinTombola = () => {
    if (remainingParticipants.length === 0) {
      setError("Inga fler deltagare i tombolan!");
      return;
    }

    setIsSpinning(true);
    setCurrentWinner(null);
    setError(null);

    // Simulate spinning animation
    let spinCount = 0;
    const spinInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * remainingParticipants.length);
      setCurrentWinner(remainingParticipants[randomIndex]);
      spinCount++;

      if (spinCount >= 20) {
        clearInterval(spinInterval);

        // Select final winner after animation
        setTimeout(() => {
          const finalIndex = Math.floor(Math.random() * remainingParticipants.length);
          const winner = remainingParticipants[finalIndex];

          setCurrentWinner(winner);
          setWinners((prev) => [...prev, winner]);
          setRemainingParticipants((prev) => prev.filter((p) => p.user_id !== winner.user_id));
          setIsSpinning(false);
        }, 500);
      }
    }, 100);
  };

  const resetTombola = () => {
    if (selectedCompetitionId) {
      localStorage.removeItem(storageKey(selectedCompetitionId));
    }
    setRemainingParticipants(allParticipants);
    setWinners([]);
    setCurrentWinner(null);
    setError(null);
  };

  const selectedCompetition = competitions.find((c) => c.id === selectedCompetitionId);

  if (isLoading && competitions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="3" />
          <p className="text-lg text-gray-700 font-medium">Laddar tävlingar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <Button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 bg-white/90 backdrop-blur hover:bg-white text-gray-700 px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border border-gray-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Tillbaka</span>
          </Button>
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800">Utlottning</h1>
            <Trophy className="w-10 h-10 text-yellow-500" />
          </div>
          <Button
            onClick={resetTombola}
            disabled={winners.length === 0}
            className="flex items-center gap-2 bg-[--primary-color] hover:bg-[--primary-color-hover] text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Återställ</span>
          </Button>
        </div>

        {/* Competition Selector */}
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6 mb-8 border border-gray-200">
          <label
            htmlFor="competition-select"
            className="block text-lg font-semibold text-gray-800 mb-3"
          >
            Välj tävling
          </label>
          <select
            id="competition-select"
            value={selectedCompetitionId || ""}
            onChange={(e) => setSelectedCompetitionId(Number(e.target.value))}
            className="w-full p-4 border-2 border-gray-200 rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-200 bg-white hover:border-gray-300 cursor-pointer"
          >
            <option value="">-- Välj en tävling --</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name} ({comp.comp_date})
              </option>
            ))}
          </select>
        </div>

        {error && <CalloutMessage message={error} color="red" />}

        {selectedCompetitionId && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 mb-8">
              <div className="bg-white/90 backdrop-blur p-6 rounded-2xl shadow-xl text-center border border-gray-200 transform hover:scale-105 transition-transform duration-200">
                <p className="text-sm font-medium text-gray-600 mb-2">Totalt</p>
                <p className="text-4xl font-bold text-gray-800">{allParticipants.length}</p>
              </div>
              <div className="bg-white/90 backdrop-blur p-6 rounded-2xl shadow-xl text-center border border-gray-200 transform hover:scale-105 transition-transform duration-200">
                <p className="text-sm font-medium text-gray-600 mb-2">Kvar</p>
                <p className="text-4xl font-bold text-gray-800">{remainingParticipants.length}</p>
              </div>
              <div className="bg-white/90 backdrop-blur p-6 rounded-2xl shadow-xl text-center border border-gray-200 transform hover:scale-105 transition-transform duration-200">
                <p className="text-sm font-medium text-gray-600 mb-2">Vinnare</p>
                <p className="text-4xl font-bold text-gray-800">{winners.length}</p>
              </div>
            </div>

            {isLoading ? (
              <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-12 mb-8 min-h-[350px] flex flex-col items-center justify-center border border-gray-200">
                <Spinner size="3" />
                <p className="mt-4 text-gray-600 font-medium">Laddar deltagare...</p>
              </div>
            ) : allParticipants.length === 0 ? (
              <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-12 mb-8 min-h-[350px] flex flex-col items-center justify-center border border-gray-200">
                <Trophy className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl text-gray-600 font-medium">
                  Inga godkända anmälningar för {selectedCompetition?.name}
                </p>
              </div>
            ) : (
              <>
                {/* Winner Display */}
                <div
                  className={`bg-white rounded-3xl shadow-2xl p-12 mb-8 min-h-[350px] flex flex-col items-center justify-center border-2 ${
                    currentWinner && !isSpinning ? "border-yellow-400" : "border-gray-200"
                  } transition-all duration-300`}
                >
                  {currentWinner ? (
                    <div
                      className={`text-center ${isSpinning ? "animate-pulse" : "animate-bounce"}`}
                    >
                      <div className="relative inline-block mb-6">
                        <Trophy className="w-24 h-24 text-yellow-500 drop-shadow-lg" />
                        {!isSpinning && (
                          <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-spin" />
                        )}
                      </div>
                      <h2 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4 drop-shadow-sm">
                        {currentWinner.climber_name}
                      </h2>
                      {!isSpinning && (
                        <div className="space-y-2">
                          <p className="text-2xl font-semibold text-gray-700">
                            🏆 Vinnare #{winners.length}
                          </p>
                          <p className="text-lg text-gray-600">Nivå {currentWinner.level}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <Trophy className="w-24 h-24 mx-auto mb-6 opacity-20" />
                      <p className="text-2xl font-medium">Tryck på "Dra vinnare" för att börja</p>
                    </div>
                  )}
                </div>

                {/* Spin Button */}
                <div className="flex justify-center mb-8">
                  <Button
                    onClick={spinTombola}
                    disabled={isSpinning || remainingParticipants.length === 0}
                    className="bg-[--secondary-color] hover:bg-[--secondary-color-hover] text-white px-16 py-7 rounded-full text-3xl font-bold shadow-2xl transform hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer flex items-center gap-4"
                  >
                    {isSpinning ? (
                      <>
                        <Spinner size="2" />
                        Snurrar...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-8 h-8 animate-pulse" />
                        Dra Vinnare
                      </>
                    )}
                  </Button>
                </div>

                {/* Winners List */}
                {winners.length > 0 && (
                  <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6 mb-8 border border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                      Vinnare ({winners.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {winners.map((winner, index) => (
                        <div
                          key={`${winner.user_id}-${index}`}
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 rounded-xl border-2 border-yellow-300 shadow-md hover:shadow-lg transition-shadow duration-200"
                        >
                          <div className="flex items-center gap-4">
                            <span className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-bold text-gray-800 text-lg">
                                {winner.climber_name}
                              </p>
                              <p className="text-sm text-gray-600 font-medium">
                                Nivå {winner.level}
                              </p>
                            </div>
                          </div>
                          <Trophy className="w-7 h-7 text-yellow-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remaining Participants */}
                {remainingParticipants.length > 0 && (
                  <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6 border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                      Kvarvarande deltagare ({remainingParticipants.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                      {remainingParticipants.map((participant) => (
                        <div
                          key={participant.user_id}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-300 hover:border-gray-400 hover:shadow-md transition-all duration-200"
                        >
                          <p className="font-semibold text-gray-800 truncate">
                            {participant.climber_name}
                          </p>
                          <p className="text-xs text-gray-600 font-medium">
                            Nivå {participant.level}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!selectedCompetitionId && !error && (
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-12 min-h-[350px] flex flex-col items-center justify-center border border-gray-200">
            <Trophy className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <p className="text-2xl text-gray-500 text-center font-medium">
              Välj en tävling ovan för att starta tombolan
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
