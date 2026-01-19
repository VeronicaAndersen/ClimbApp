import { CompetitionResponse } from "@/types";

export interface SortedCompetitions {
  upcoming: CompetitionResponse[];
  past: CompetitionResponse[];
}

/**
 * Separates and sorts competitions into upcoming and past categories
 * Upcoming competitions are sorted chronologically (soonest first)
 * Past competitions are sorted reverse chronologically (most recent first)
 *
 * @param competitions - Array of competitions to sort
 * @returns Object with sorted upcoming and past competitions
 */
export const sortCompetitions = (competitions: CompetitionResponse[]): SortedCompetitions => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = competitions
    .filter((comp) => new Date(comp.comp_date) >= today)
    .sort((a, b) => new Date(a.comp_date).getTime() - new Date(b.comp_date).getTime());

  const past = competitions
    .filter((comp) => new Date(comp.comp_date) < today)
    .sort((a, b) => new Date(b.comp_date).getTime() - new Date(a.comp_date).getTime());

  return { upcoming, past };
};
