/**
 * Utility functions for competition management
 */
import type { ScoreData } from "@/types";

/**
 * Maps raw score input to a ScoreData payload.
 * Bonus and top are independent — a climber may top without having a bonus.
 */
export function normalizeScorePayload(s: {
  attempts_total: number;
  attempts_to_bonus: number;
  attempts_to_top: number;
}): ScoreData {
  return {
    attempts_total: s.attempts_total,
    got_bonus: s.attempts_to_bonus > 0,
    got_top: s.attempts_to_top > 0,
    attempts_to_bonus: s.attempts_to_bonus,
    attempts_to_top: s.attempts_to_top,
  };
}

/**
 * Checks if the given date is today
 */
export const isToday = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

/**
 * Checks if the user is an admin
 */
export const isAdmin = (userScope: string): boolean => {
  return userScope === "admin" || userScope === "superadmin";
};

/**
 * Determines if editing should be allowed for a competition
 */
export const canEditCompetition = (
  competitionDate: string,
  userScope: string,
  adminOverride?: boolean
): boolean => {
  // Admins can always edit if they enable the override
  if (isAdmin(userScope) && adminOverride) {
    return true;
  }

  // Anyone can edit on competition day
  if (isToday(competitionDate)) {
    return true;
  }

  return false;
};
