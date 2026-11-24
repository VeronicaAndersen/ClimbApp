import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { getAllRegistrations, getCompetitions } from "@/services/api";
import { CompetitionResponse } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";
import {
  climberFromRegistration,
  newGuest,
  parseSavedTombola,
  remainingFromKeys,
  tombolaStorageKey,
  winnersFromKeys,
  type TombolaParticipant,
} from "@/utils/tombola";

const SPIN_STEPS = 20;

/**
 * State for the tombola page: competitions, the picked competition's approved
 * climbers plus device-only guests, and the draw. Guests and winners are kept
 * in localStorage per competition.
 */
export function useTombola() {
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
  // Set once the picked competition's saved state is loaded, so the save
  // effect never overwrites it with the previous competition's state.
  const loadedCompId = useRef<number | null>(null);

  const allParticipants = useMemo(() => [...climbers, ...guests], [climbers, guests]);
  const winners = useMemo(
    () => winnersFromKeys(allParticipants, winnerKeys),
    [allParticipants, winnerKeys]
  );
  const remainingParticipants = useMemo(
    () => remainingFromKeys(allParticipants, winnerKeys),
    [allParticipants, winnerKeys]
  );

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        setIsLoading(true);
        setCompetitions(await getCompetitions());
      } catch (err) {
        setError(getUserFriendlyError(err));
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
        setClimbers(registrations.filter((reg) => reg.approved).map(climberFromRegistration));

        const saved = parseSavedTombola(
          localStorage.getItem(tombolaStorageKey(selectedCompetitionId))
        );
        setGuests(saved.guests);
        setWinnerKeys(saved.winnerKeys);
        setCurrentWinner(null);
        loadedCompId.current = selectedCompetitionId;
      } catch (err) {
        setError(getUserFriendlyError(err));
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

  // Flicks through random names, slowing down, then settles on the winner.
  const spinTombola = useCallback(() => {
    const pool = remainingParticipants;
    if (pool.length === 0) {
      setError("Inga fler deltagare i tombolan!");
      return;
    }

    setIsSpinning(true);
    setCurrentWinner(null);
    setError(null);

    let step = 0;
    const pick = () => pool[Math.floor(Math.random() * pool.length)];

    const snap = () => {
      setCurrentWinner(pick());
      step++;
      if (step < SPIN_STEPS) {
        const t = step / SPIN_STEPS;
        setTimeout(snap, 50 + 350 * t * t);
      } else {
        const winner = pick();
        setCurrentWinner(winner);
        setWinnerKeys((prev) => [...prev, winner.key]);
        setIsSpinning(false);
      }
    };

    setTimeout(snap, 50);
  }, [remainingParticipants]);

  // Space draws a winner, unless the user is typing.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
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

  return {
    competitions,
    selectedCompetitionId,
    setSelectedCompetitionId,
    selectedCompetition: competitions.find((c) => c.id === selectedCompetitionId),
    allParticipants,
    remainingParticipants,
    winners,
    currentWinner,
    guestName,
    setGuestName,
    isSpinning,
    isLoading,
    error,
    spinTombola,
    resetTombola,
    addGuest,
    removeGuest,
  };
}
