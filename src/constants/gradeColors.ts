/**
 * Grade level color mappings used for visual indicators throughout the app
 */

export const DEFAULT_GRADE_COLOR = "#D1D5DB";

export const GRADE_COLORS: Record<number, string> = {
  1: "#C084FC", // Purple
  2: "#F9A8D4", // Pink
  3: "#FDBA74", // Orange
  4: "#FACC15", // Yellow
  5: "#4ADE80", // Green
  6: "#FFFFFF", // White
  7: "#000000", // Black
};

/**
 * Get the color for a given grade level
 * @param gradeLevel - The grade level number (1-7)
 * @returns The hex color code for the grade level, or default color if not found
 */
export const getGradeColor = (gradeLevel?: number | null): string => {
  if (!gradeLevel) return DEFAULT_GRADE_COLOR;
  return GRADE_COLORS[gradeLevel] ?? DEFAULT_GRADE_COLOR;
};
