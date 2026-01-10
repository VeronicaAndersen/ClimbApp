/**
 * Utility functions for competition management
 */

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
