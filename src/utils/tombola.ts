// ----------------------------------------------------------
// Tombola state kept on this device only (localStorage), per competition.
// Approved climbers come from the API; guests are added on the device and
// never sent to the API. Winners are stored as participant keys so the
// remaining pool is always "all participants minus winners".
// ----------------------------------------------------------

export type TombolaParticipant = {
  key: string;
  name: string;
  /** Registration level, or null for a guest. */
  level: number | null;
};

export type SavedTombola = {
  guests: TombolaParticipant[];
  winnerKeys: string[];
};

export const GUEST_NAME_MAX_LENGTH = 60;

export const tombolaStorageKey = (compId: number) => `tombola_${compId}`;

export const climberKey = (userId: number) => `c${userId}`;

export const newGuest = (name: string, id: string): TombolaParticipant => ({
  key: `g${id}`,
  name: name.trim().slice(0, GUEST_NAME_MAX_LENGTH),
  level: null,
});

const EMPTY: SavedTombola = { guests: [], winnerKeys: [] };

function isGuest(value: unknown): value is { key: string; name: string } {
  if (typeof value !== "object" || value === null) return false;
  const { key, name } = value as { key?: unknown; name?: unknown };
  return typeof key === "string" && key.startsWith("g") && typeof name === "string";
}

/**
 * Reads a saved tombola. Also accepts the older format, where winners were
 * whole registrations ({ user_id, ... }). Anything unreadable starts fresh.
 */
export function parseSavedTombola(raw: string | null): SavedTombola {
  if (!raw) return EMPTY;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (typeof data !== "object" || data === null) return EMPTY;
  const { guests, winnerKeys, winners } = data as Record<string, unknown>;

  const savedGuests = Array.isArray(guests)
    ? guests.filter(isGuest).map((g) => ({ key: g.key, name: g.name, level: null }))
    : [];

  if (Array.isArray(winnerKeys)) {
    return {
      guests: savedGuests,
      winnerKeys: winnerKeys.filter((k): k is string => typeof k === "string"),
    };
  }

  // Older format: { winners: RegistrationWithClimber[], remainingParticipants: [...] }
  if (Array.isArray(winners)) {
    const keys = winners
      .map((w) => (w as { user_id?: unknown } | null)?.user_id)
      .filter((id): id is number => typeof id === "number")
      .map(climberKey);
    return { guests: savedGuests, winnerKeys: keys };
  }

  return { guests: savedGuests, winnerKeys: [] };
}
