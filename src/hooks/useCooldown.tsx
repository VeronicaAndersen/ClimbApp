import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_RETRY_AFTER_SECONDS, isRateLimitError } from "@/lib/apiError";

/** Longest time a form stays disabled; see MAX_RETRY_AFTER_SECONDS. */
export const MAX_COOLDOWN_SECONDS = MAX_RETRY_AFTER_SECONDS;

export type UseCooldownOptions = {
  /** Called when a cooldown runs out, e.g. to clear the "too many attempts" text. */
  onExpire?: () => void;
};

/**
 * Disables an action for a while, e.g. a submit button after a 429.
 * `startCooldownFor(error)` starts it from a rate-limit error's Retry-After
 * and ignores other errors or a missing wait.
 */
export function useCooldown({ onExpire }: UseCooldownOptions = {}) {
  const [until, setUntil] = useState<number | null>(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (until === null) return;
    const timer = setTimeout(
      () => {
        setUntil(null);
        onExpireRef.current?.();
      },
      Math.max(0, until - Date.now())
    );
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
