import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Spinner } from "@radix-ui/themes";
import { Trophy, RotateCcw, ArrowLeft, Sparkles, Users } from "lucide-react";
import { getAllRegistrations, getCompetitions } from "@/services/api";
import { RegistrationWithClimber, CompetitionResponse } from "@/types";
import CalloutMessage from "@/components/user_feedback/CalloutMessage";
import { getGradeColor } from "@/constants/gradeColors";

const storageKey = (compId: number) => `tombola_${compId}`;

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

  useEffect(() => {
    if (!selectedCompetitionId) return;

    const fetchRegistrations = async () => {
      loadedCompId.current = null;
      try {
        setIsLoading(true);
        setError(null);
        const registrations = await getAllRegistrations(selectedCompetitionId);
        const approved = registrations.filter((reg) => reg.approved);
        setAllParticipants(approved);

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
            setRemainingParticipants(approved);
          }
        } else {
          setWinners([]);
          setRemainingParticipants(approved);
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

  useEffect(() => {
    if (!selectedCompetitionId || loadedCompId.current !== selectedCompetitionId) return;
    localStorage.setItem(
      storageKey(selectedCompetitionId),
      JSON.stringify({ winners, remainingParticipants })
    );
  }, [winners, remainingParticipants, selectedCompetitionId]);

  const spinTombola = () => {
    const pool = remainingParticipants;
    if (pool.length === 0) {
      setError("Inga fler deltagare i tombolan!");
      return;
    }

    setIsSpinning(true);
    setCurrentWinner(null);
    setError(null);

    // Slowdown effect: starts at ~50ms per tick, ends at ~400ms
    const steps = 20;
    let step = 0;

    const snap = () => {
      setCurrentWinner(pool[Math.floor(Math.random() * pool.length)]);
      step++;
      if (step < steps) {
        const t = step / steps;
        setTimeout(snap, 50 + 350 * t * t);
      } else {
        const winner = pool[Math.floor(Math.random() * pool.length)];
        setCurrentWinner(winner);
        setWinners((prev) => [...prev, winner]);
        setRemainingParticipants((prev) => prev.filter((p) => p.user_id !== winner.user_id));
        setIsSpinning(false);
      }
    };

    setTimeout(snap, 50);
  };

  const resetTombola = () => {
    if (selectedCompetitionId) localStorage.removeItem(storageKey(selectedCompetitionId));
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
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <Button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 bg-white/90 backdrop-blur hover:bg-white text-gray-700 px-4 py-2 rounded-xl shadow hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Tillbaka
          </Button>

          <div className="flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-yellow-500 animate-pulse" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Utlottning</h1>
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>

          <Button
            onClick={resetTombola}
            disabled={winners.length === 0}
            className="flex items-center gap-2 bg-[--primary-color] hover:bg-[--primary-color-hover] text-white px-4 py-2 rounded-xl shadow hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Återställ
          </Button>
        </div>

        {/* Competition Selector */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-6 border border-gray-200">
          <label
            htmlFor="competition-select"
            className="block text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide"
          >
            Tävling
          </label>
          <select
            id="competition-select"
            value={selectedCompetitionId ?? ""}
            onChange={(e) =>
              setSelectedCompetitionId(e.target.value ? Number(e.target.value) : null)
            }
            className="w-full p-2.5 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[--secondary-color] bg-white text-gray-800"
          >
            <option value="">Välj tävling...</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name} ({comp.comp_date})
              </option>
            ))}
          </select>
        </div>

        {error && <CalloutMessage message={error} color="red" />}

        {!selectedCompetitionId && !error && (
          <div className="bg-white rounded-2xl shadow-md p-12 flex flex-col items-center justify-center border border-gray-200 text-center">
            <Trophy className="w-16 h-16 text-gray-200 mb-4" />
            <p className="text-lg text-gray-400 font-medium">
              Välj en tävling ovan för att starta tombolan
            </p>
          </div>
        )}

        {selectedCompetitionId && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-4 text-center border-t-4 border-blue-400">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Totalt
                </p>
                <p className="text-3xl font-bold text-gray-800">{allParticipants.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 text-center border-t-4 border-emerald-400">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Kvar
                </p>
                <p className="text-3xl font-bold text-gray-800">{remainingParticipants.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 text-center border-t-4 border-yellow-400">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Vinnare
                </p>
                <p className="text-3xl font-bold text-gray-800">{winners.length}</p>
              </div>
            </div>

            {isLoading ? (
              <div className="bg-white rounded-2xl shadow-md p-12 flex flex-col items-center justify-center border border-gray-200 min-h-[280px]">
                <Spinner size="3" />
                <p className="mt-4 text-gray-500 font-medium">Laddar deltagare...</p>
              </div>
            ) : allParticipants.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-12 flex flex-col items-center justify-center border border-gray-200 min-h-[280px]">
                <Users className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium">
                  Inga godkända anmälningar för {selectedCompetition?.name}
                </p>
              </div>
            ) : (
              <>
                {/* Winner Display */}
                <div
                  className={`bg-white rounded-2xl shadow-md p-10 mb-6 min-h-[260px] flex flex-col items-center justify-center border-2 transition-all duration-300 ${
                    currentWinner && !isSpinning
                      ? "border-yellow-400 shadow-yellow-100 shadow-xl"
                      : "border-gray-100"
                  }`}
                >
                  {currentWinner ? (
                    <div
                      key={isSpinning ? "spinning" : `reveal-${winners.length}`}
                      className={`text-center transition-all duration-200 ${
                        isSpinning ? "opacity-60 scale-95" : "opacity-100 scale-100"
                      }`}
                    >
                      <Trophy
                        className={`w-14 h-14 mx-auto mb-4 transition-colors duration-300 ${
                          isSpinning ? "text-gray-300" : "text-yellow-400"
                        }`}
                      />
                      <p
                        className={`text-4xl md:text-5xl font-bold mb-3 transition-colors duration-300 ${
                          isSpinning ? "text-gray-400" : "text-gray-800"
                        }`}
                      >
                        {currentWinner.climber_name}
                      </p>
                      {!isSpinning && (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 font-semibold px-4 py-1.5 rounded-full border border-yellow-200 text-sm">
                            <Sparkles className="w-4 h-4" />
                            Vinnare #{winners.length}
                          </span>
                          <span
                            className="inline-block w-4 h-4 rounded-full border border-gray-300 mt-1"
                            style={{ backgroundColor: getGradeColor(currentWinner.level) }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-300">
                      <Trophy className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-400">
                        Tryck på "Dra vinnare" för att börja
                      </p>
                    </div>
                  )}
                </div>

                {/* Spin Button */}
                <div className="flex justify-center mb-6">
                  <Button
                    onClick={spinTombola}
                    disabled={isSpinning || remainingParticipants.length === 0}
                    className="bg-[--secondary-color] hover:bg-[--secondary-color-hover] text-white px-14 py-6 rounded-full text-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer flex items-center gap-3"
                  >
                    {isSpinning ? (
                      <>
                        <Spinner size="2" />
                        Snurrar...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        Dra vinnare
                      </>
                    )}
                  </Button>
                </div>

                {/* Winners List */}
                {winners.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-md p-5 mb-4 border border-gray-200">
                    <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      Vinnare ({winners.length})
                    </h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {winners.map((winner, index) => (
                        <div
                          key={winner.user_id}
                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200"
                        >
                          <span className="w-8 h-8 shrink-0 bg-gradient-to-br from-yellow-400 to-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 truncate">
                              {winner.climber_name}
                            </p>
                            <span
                              className="inline-block w-3 h-3 rounded-full border border-gray-300 mt-0.5"
                              style={{ backgroundColor: getGradeColor(winner.level) }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remaining Participants */}
                {remainingParticipants.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-200">
                    <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      Kvarvarande ({remainingParticipants.length})
                    </h3>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                      {remainingParticipants.map((p) => (
                        <span
                          key={p.user_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700"
                        >
                          {p.climber_name}
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full border border-gray-300 shrink-0"
                            style={{ backgroundColor: getGradeColor(p.level) }}
                          />
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
