import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CompetitionResponse } from "@/types";
import { StatisticsView } from "@/components/admin/StatisticsView";
import { renderWithQueryClient } from "@/Tests/utils/renderWithQueryClient";

const { getCompetitionsMock } = vi.hoisted(() => ({ getCompetitionsMock: vi.fn() }));

vi.mock("@/services/api", () => ({ getCompetitions: getCompetitionsMock }));
vi.mock("@/components/admin/ProblemStatsTable", () => ({
  ProblemStatsTable: ({ comp_id, level }: { comp_id: number; level: number }) => (
    <div data-testid="problem-stats-table">
      comp {comp_id} level {level}
    </div>
  ),
}));

const competition: CompetitionResponse = {
  id: 7,
  name: "Vårcupen",
  description: "",
  comp_type: "cup",
  comp_date: "2026-04-01",
  season_id: 1,
  round_no: null,
};

describe("StatisticsView", () => {
  beforeEach(() => {
    getCompetitionsMock.mockReset();
  });

  it("shows an empty message when there are no competitions", async () => {
    getCompetitionsMock.mockResolvedValue([]);
    renderWithQueryClient(<StatisticsView />);

    expect(await screen.findByText("Inga tävlingar tillgängliga.")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows the empty message when the competitions cannot be loaded", async () => {
    getCompetitionsMock.mockRejectedValue(new Error("boom"));
    renderWithQueryClient(<StatisticsView />);

    expect(await screen.findByText("Inga tävlingar tillgängliga.")).toBeInTheDocument();
  });

  it("renders the stats table after picking a competition and a level", async () => {
    getCompetitionsMock.mockResolvedValue([competition]);
    renderWithQueryClient(<StatisticsView />);

    const select = await screen.findByRole("combobox");
    expect(screen.getByText("Välj en tävling ovan för att visa statistik.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nivå 1" })).not.toBeInTheDocument();

    await userEvent.selectOptions(select, "7");
    expect(screen.getByText("Välj en nivå ovan för att visa statistik.")).toBeInTheDocument();
    expect(screen.queryByTestId("problem-stats-table")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Nivå 3" }));
    expect(screen.getByTestId("problem-stats-table")).toHaveTextContent("comp 7 level 3");
  });
});
