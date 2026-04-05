/**
 * Integration test for CompetitionSummaryCard.
 *
 * Tests that the component correctly combines data from its props, the
 * gradeColors utility, and the four nested StatCard sub-components to
 * produce the expected output.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CompetitionSummaryCard from "../CompetitionSummaryCard";
import type { CompetitionWithScores } from "@/hooks/useUserCompetitions";
import { GRADE_COLORS } from "@/constants/gradeColors";

function makeCompetition(overrides: Partial<CompetitionWithScores> = {}): CompetitionWithScores {
  return {
    competition: {
      id: 1,
      name: "Test Cup 2026",
      comp_date: "2026-06-01",
      description: null,
      comp_type: "QUALIFIER",
      season_id: 1,
      round_no: 1,
    },
    level: 3,
    summary: {
      totalProblems: 8,
      problemsWithTop: 5,
      problemsWithBonus: 7,
      totalAttempts: 24,
      averageAttempts: 3,
    },
    ...overrides,
  };
}

describe("CompetitionSummaryCard — content", () => {
  it("renders the competition name", () => {
    render(<CompetitionSummaryCard competitionData={makeCompetition()} />);
    expect(screen.getByText("Test Cup 2026")).toBeInTheDocument();
  });

  it("renders the formatted Swedish date", () => {
    render(<CompetitionSummaryCard competitionData={makeCompetition()} />);
    // sv-SE locale: "1 juni 2026"
    expect(screen.getByText(/juni 2026/i)).toBeInTheDocument();
  });

  it("renders the level badge", () => {
    render(<CompetitionSummaryCard competitionData={makeCompetition({ level: 5 })} />);
    expect(screen.getByText(/Nivå 5/)).toBeInTheDocument();
  });

  it("renders the grade color circle with the correct background color", () => {
    render(<CompetitionSummaryCard competitionData={makeCompetition({ level: 3 })} />);
    const circle = screen.getByLabelText(/Gradnivå 3/i);
    expect(circle).toHaveStyle({ backgroundColor: GRADE_COLORS[3] });
  });
});

describe("CompetitionSummaryCard — description", () => {
  it("shows description when provided", () => {
    const data = makeCompetition({
      competition: {
        id: 1,
        name: "Desc Cup",
        comp_date: "2026-06-01",
        description: "Annual championship in Stockholm",
        comp_type: "QUALIFIER",
        season_id: 1,
        round_no: 1,
      },
    });
    render(<CompetitionSummaryCard competitionData={data} />);
    expect(screen.getByText("Annual championship in Stockholm")).toBeInTheDocument();
  });

  it("hides description block when null", () => {
    render(<CompetitionSummaryCard competitionData={makeCompetition()} />);
    expect(screen.queryByText(/championship/i)).not.toBeInTheDocument();
  });
});

describe("CompetitionSummaryCard — stat cards", () => {
  it("renders all four stat card labels", () => {
    render(<CompetitionSummaryCard competitionData={makeCompetition()} />);
    expect(screen.getByText("Toppar")).toBeInTheDocument();
    expect(screen.getByText("Bonusar")).toBeInTheDocument();
    expect(screen.getByText("Totalt försök")).toBeInTheDocument();
    expect(screen.getByText("Snitt försök")).toBeInTheDocument();
  });

  it("renders tops count and total problems", () => {
    render(<CompetitionSummaryCard competitionData={makeCompetition()} />);
    // problemsWithTop = 5, totalProblems = 8
    expect(screen.getByText("5")).toBeInTheDocument();
    // totalProblems "/ 8" appears for tops and bonuses
    const totals = screen.getAllByText(/\/ 8/);
    expect(totals.length).toBeGreaterThanOrEqual(1);
  });

  it("renders total attempts value", () => {
    render(
      <CompetitionSummaryCard
        competitionData={makeCompetition({
          summary: {
            totalProblems: 8,
            problemsWithTop: 3,
            problemsWithBonus: 4,
            totalAttempts: 42,
            averageAttempts: 5,
          },
        })}
      />
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders average attempts value", () => {
    render(
      <CompetitionSummaryCard
        competitionData={makeCompetition({
          summary: {
            totalProblems: 8,
            problemsWithTop: 2,
            problemsWithBonus: 3,
            totalAttempts: 20,
            averageAttempts: 2.5,
          },
        })}
      />
    );
    expect(screen.getByText("2.5")).toBeInTheDocument();
  });
});
