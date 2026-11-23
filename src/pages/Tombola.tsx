import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Spinner } from "@radix-ui/themes";
import { Trophy, RotateCcw, ArrowLeft, Sparkles, Users, UserPlus, X } from "lucide-react";
import { getAllRegistrations, getCompetitions, getClimberById } from "@/services/api";
import { CompetitionResponse } from "@/types";
import CalloutMessage from "@/components/feedback/CalloutMessage";
import { getGradeColor } from "@/constants/gradeColors";
import { getUserFriendlyError } from "@/utils/errorMessages";
import {
  GUEST_NAME_MAX_LENGTH,
  climberKey,
  newGuest,
  parseSavedTombola,
  tombolaStorageKey,
  type TombolaParticipant,
} from "@/utils/tombola";

export default function Tombola() {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<CompetitionResponse[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(null);
  const [climbers, setClimbers] = useState<TombolaParticipant[]>([]);
  // Guests live only in this device's localStorage; they are never sent to the API.
  const [guests, setGuests] = useState<TombolaParticipant[]>([]);
  const [guestName, setGuestName] = useState("");
  const [winnerKeys, setWinnerKeys] = useState<string[]>([]);
  const [currentWinner, setCurrentWinner] = useState<TombolaParticipant | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedCompId = useRef<number | null>(null);

  const allParticipants = useMemo(() => [...climbers, ...guests], [climbers, guests]);
  const winners = useMemo(() => {
    const byKey = new Map(allParticipants.map((p) => [p.key, p]));
    return winnerKeys
      .map((key) => byKey.get(key))
      .filter((p): p is TombolaParticipant => p !== undefined);
  }, [allParticipants, winnerKeys]);
  const remainingParticipants = useMemo(() => {
    const won = new Set(winnerKeys);
    return allParticipants.filter((p) => !won.has(p.key));
  }, [allParticipants, winnerKeys]);

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        setIsLoading(true);
        const comps = await getCompetitions();
        setCompetitions(comps);
      } catch (err) {
        setError(err instanceof Error ? getUserFriendlyError(err) : "Kunde inte hämta tävlingar");
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

        const climberInfo = await Promise.all(approved.map((r) => getClimberById(r.user_id)));
        setClimbers(
          approved.map((reg, i) => ({
            key: climberKey(reg.user_id),
            name: `${climberInfo[i].firstname} ${climberInfo[i].lastname}`,
            level: reg.level,
          }))
        );

        const saved = parseSavedTombola(
          localStorage.getItem(tombolaStorageKey(selectedCompetitionId))
        );
        setGuests(saved.guests);
        setWinnerKeys(saved.winnerKeys);
        setCurrentWinner(null);
        loadedCompId.current = selectedCompetitionId;
      } catch (err) {
        setError(err instanceof Error ? getUserFriendlyError(err) : "Kunde inte hämta anmälningar");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRegistrations();
  }, [selectedCompetitionId]);

  useEffect(() => {
    if (!selectedCompetitionId || loadedCompId.current !== selectedCompetitionId) return;
    try {
      localStorage.setItem(
        tombolaStorageKey(selectedCompetitionId),
        JSON.stringify({ guests, winnerKeys })
      );
    } catch {
      // Storage blocked or full: the draw still works for this visit.
    }
  }, [guests, winnerKeys, selectedCompetitionId]);

  const spinTombola = useCallback(() => {
    const pool = remainingParticipants;
    if (pool.length === 0) {
      setError("Inga fler deltagare i tombolan!");
      return;
    }

    setIsSpinning(true);
    setCurrentWinner(null);
    setError(null);

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
        setWinnerKeys((prev) => [...prev, winner.key]);
        setIsSpinning(false);
      }
    };

    setTimeout(snap, 50);
  }, [remainingParticipants]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // Ignorera inputs / textarea
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.code === "Space" && !isSpinning && remainingParticipants.length > 0) {
        e.preventDefault();
        spinTombola();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSpinning, remainingParticipants, spinTombola]);

  // Starts a new draw; guests added on this device stay in the pool.
  const resetTombola = () => {
    setWinnerKeys([]);
    setCurrentWinner(null);
    setError(null);
  };

  const addGuest = (e: FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setGuests((prev) => [...prev, newGuest(guestName, crypto.randomUUID())]);
    setGuestName("");
  };

  const removeGuest = (key: string) => {
    setGuests((prev) => prev.filter((g) => g.key !== key));
  };

  const selectedCompetition = competitions.find((c) => c.id === selectedCompetitionId);

  if (isLoading && competitions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="3" />
          <p className="text-lg text-muted-foreground font-medium">Laddar tävlingar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <Button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 bg-card/90 backdrop-blur hover:bg-card text-muted-foreground px-4 py-2 rounded-xl shadow-sm hover:shadow-soft transition-all duration-200 cursor-pointer border border-border text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Tillbaka
          </Button>

          <div className="flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-yellow-500 animate-pulse" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Utlottning</h1>
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>

          <Button
            onClick={resetTombola}
            disabled={winners.length === 0}
            className="flex items-center gap-2 bg-sage text-charcoal hover:bg-sage/80 px-4 py-2 rounded-xl shadow-sm hover:shadow-soft transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Återställ
          </Button>
        </div>

        {/* Competition Selector */}
        <div className="bg-card rounded-2xl shadow-soft p-5 mb-6 border border-border">
          <label
            htmlFor="competition-select"
            className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide"
          >
            Tävling
          </label>
          <select
            id="competition-select"
            value={selectedCompetitionId ?? ""}
            onChange={(e) =>
              setSelectedCompetitionId(e.target.value ? Number(e.target.value) : null)
            }
            className="input-base p-2.5"
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
          <div className="bg-card rounded-2xl shadow-soft p-12 flex flex-col items-center justify-center border border-border text-center">
            <Trophy className="w-16 h-16 text-muted-foreground/40 mb-4" />
            <p className="text-lg text-muted-foreground font-medium">
              Välj en tävling ovan för att starta tombolan
            </p>
          </div>
        )}

        {selectedCompetitionId && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-card rounded-xl shadow-sm p-4 text-center border-t-4 border-blue-400">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Totalt
                </p>
                <p className="text-3xl font-bold text-foreground">{allParticipants.length}</p>
              </div>
              <div className="bg-card rounded-xl shadow-sm p-4 text-center border-t-4 border-emerald-400">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Kvar
                </p>
                <p className="text-3xl font-bold text-foreground">{remainingParticipants.length}</p>
              </div>
              <div className="bg-card rounded-xl shadow-sm p-4 text-center border-t-4 border-yellow-400">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Vinnare
                </p>
                <p className="text-3xl font-bold text-foreground">{winners.length}</p>
              </div>
            </div>

            {/* Add guest (this device only) */}
            {!isLoading && (
              <form
                onSubmit={addGuest}
                className="bg-card rounded-2xl shadow-soft p-5 mb-6 border border-border"
              >
                <label
                  htmlFor="guest-name"
                  className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide"
                >
                  Lägg till person
                </label>
                <div className="flex gap-2">
                  <input
                    id="guest-name"
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    maxLength={GUEST_NAME_MAX_LENGTH}
                    placeholder="Namn"
                    autoComplete="off"
                    className="input-base p-2.5 flex-1 min-w-0"
                  />
                  <Button
                    type="submit"
                    disabled={!guestName.trim() || isSpinning}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
                  >
                    <UserPlus className="w-4 h-4" />
                    Lägg till
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Sparas bara på den här enheten, inte i databasen.
                </p>
              </form>
            )}

            {isLoading ? (
              <div className="bg-card rounded-2xl shadow-soft p-12 flex flex-col items-center justify-center border border-border min-h-[280px]">
                <Spinner size="3" />
                <p className="mt-4 text-muted-foreground font-medium">Laddar deltagare...</p>
              </div>
            ) : allParticipants.length === 0 ? (
              <div className="bg-card rounded-2xl shadow-soft p-12 flex flex-col items-center justify-center border border-border min-h-[280px]">
                <Users className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">
                  Inga godkända anmälningar för {selectedCompetition?.name}. Lägg till personer
                  ovan.
                </p>
              </div>
            ) : (
              <>
                {/* Winner Display */}
                <div
                  className={`bg-card rounded-2xl shadow-soft p-10 mb-6 min-h-[260px] flex flex-col items-center justify-center border-2 transition-all duration-300 ${
                    currentWinner && !isSpinning ? "border-yellow-400 shadow-soft" : "border-border"
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
                          isSpinning ? "text-muted-foreground/40" : "text-yellow-400"
                        }`}
                      />
                      <p
                        className={`text-4xl md:text-5xl font-bold mb-3 transition-colors duration-300 ${
                          isSpinning ? "text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {currentWinner.name}
                      </p>
                      {!isSpinning && (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300 font-semibold px-4 py-1.5 rounded-full border border-yellow-200 dark:border-yellow-500/30 text-sm">
                            <Sparkles className="w-4 h-4" />
                            Vinnare #{winners.length}
                          </span>
                          {currentWinner.level !== null && (
                            <span
                              className="inline-block w-4 h-4 rounded-full border border-border mt-1"
                              style={{ backgroundColor: getGradeColor(currentWinner.level) }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground/40">
                      <Trophy className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-lg font-medium text-muted-foreground">
                        Tryck på "Dra vinnare" för att börja
                      </p>
                    </div>
                  )}
                </div>

                {/* Spin Button */}
                <div className="flex justify-center mb-6">
                  <Button
                    id="btnWinner"
                    onClick={spinTombola}
                    disabled={isSpinning || remainingParticipants.length === 0}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground px-14 py-6 rounded-full text-2xl font-bold shadow-soft hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer flex items-center gap-3"
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
                  <div className="bg-card rounded-2xl shadow-soft p-5 mb-4 border border-border">
                    <h3 className="text-base font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      Vinnare ({winners.length})
                    </h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {winners.map((winner, index) => (
                        <div
                          key={winner.key}
                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-500/10 dark:to-amber-500/10 rounded-lg border border-yellow-200 dark:border-yellow-500/30"
                        >
                          <span className="w-8 h-8 shrink-0 bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-950 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{winner.name}</p>
                            {winner.level !== null && (
                              <span
                                className="inline-block w-3 h-3 rounded-full border border-border mt-0.5"
                                style={{ backgroundColor: getGradeColor(winner.level) }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remaining Participants */}
                {remainingParticipants.length > 0 && (
                  <div className="bg-card rounded-2xl shadow-soft p-5 border border-border">
                    <h3 className="text-base font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      Kvarvarande ({remainingParticipants.length})
                    </h3>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                      {remainingParticipants.map((p) => (
                        <span
                          key={p.key}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted/50 border border-border rounded-full text-sm text-muted-foreground"
                        >
                          {p.name}
                          {p.level !== null ? (
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full border border-border shrink-0"
                              style={{ backgroundColor: getGradeColor(p.level) }}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeGuest(p.key)}
                              disabled={isSpinning}
                              aria-label={`Ta bort ${p.name}`}
                              className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
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
