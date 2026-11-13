import { useCallback, useEffect, useState } from "react";
import { isRateLimitError } from "@/lib/apiError";

/**
 * Longest time a form stays disabled. A server can ask for more (failed
 * logins are counted over 15 minutes), but past this the user may try again
 * and simply gets a new 429 with a fresh wait.
 */
export const MAX_COOLDOWN_SECONDS = 60 * 60;

/**
 * Disables an action for a while, e.g. a submit button after a 429.
 * `startCooldownFor(error)` starts it from a rate-limit error's Retry-After
 * and ignores other errors or a missing wait.
 */
export function useCooldown() {
  const [until, setUntil] = useState<number | null>(null);

  useEffect(() => {
    if (until === null) return;
    const timer = setTimeout(() => setUntil(null), Math.max(0, until - Date.now()));
    return () => clearTimeout(timer);
  }, [until]);

  const startCooldown = useCallback((seconds: number | null) => {
    if (seconds === null || seconds <= 0) return;
    setUntil(Date.now() + Math.min(seconds, MAX_COOLDOWN_SECONDS) * 1000);
  }, []);

  const startCooldownFor = useCallback(
    (error: unknown) => {
      if (isRateLimitError(error)) startCooldown(error.retryAfterSeconds);
    },
    [startCooldown]
  );

  return { isCoolingDown: until !== null, startCooldown, startCooldownFor };
}
