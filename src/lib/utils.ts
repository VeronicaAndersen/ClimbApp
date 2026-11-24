import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * A short haptic tick for meaningful moments (a successful save). Fires on
 * the same frame as the visual change; a no-op where vibration is unsupported.
 */
export function haptic(durationMs = 10) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(durationMs);
  }
}
