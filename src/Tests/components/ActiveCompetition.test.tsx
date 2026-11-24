import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { CompetitionResponse } from "@/types";
import { ActiveCompetition } from "@/components/ActiveCompetition";
import { createTestQueryClient } from "@/Tests/utils/renderWithQueryClient";

const { getMyInfoMock, getCompetitionsMock, getCompRegistrationInfoMock } = vi.hoisted(() => ({
  getMyInfoMock: vi.fn(),
  getCompetitionsMock: vi.fn(),
  getCompRegistrationInfoMock: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  getMyInfo: getMyInfoMock,
  getCompetitions: getCompetitionsMock,
  getCompRegistrationInfo: getCompRegistrationInfoMock,
}));
vi.mock("@/components/CompetitionScores", () => ({
  default: (props: { competitionId: number; userScope: string; viewingClimberName: string }) => (
    <div data-testid="competition-scores">
      comp {props.competitionId} scope {props.userScope} name {props.viewingClimberName}
    </div>
  ),
}));
vi.mock("@/components/SessionSwitcher", () => ({ SessionSwitcher: () => null }));

const competition = (id: number, name: string, comp_date: string): CompetitionResponse => ({
  id,
  name,
  description: "",
  comp_type: "cup",
  comp_date,
  season_id: 1,
  round_no: null,
});

const EMPTY_TEXT = /Just nu har du inga aktiva tävlingar/;
const ERROR_TEXT = "Ett fel uppstod vid hämtning av aktiv tävling.";

/** Registered and approved for every competition id in `approvedIds`. */
function approveOnly(...approvedIds: number[]) {
  getCompRegistrationInfoMock.mockImplementation(async (id: number) => ({
    approved: approvedIds.includes(id),
    level: 3,
  }));
}

function renderActiveCompetition() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ActiveCompetition />
    </QueryClientProvider>
  );
}

describe("ActiveCompetition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 5, 15, 10, 0, 0));
    getMyInfoMock.mockResolvedValue({ user_scope: "climber", username: "anna" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("prefers an approved competition held today over a later one", async () => {
    getCompetitionsMock.mockResolvedValue([
      competition(1, "Past", "2026-06-01"),
      competition(2, "Later", "2026-06-20"),
      competition(3, "Today", "2026-06-15"),
    ]);
    approveOnly(1, 2, 3);
    renderActiveCompetition();

    expect(await screen.findByText("Today")).toBeInTheDocument();
    expect(screen.getByTestId("competition-scores")).toHaveTextContent(
      "comp 3 scope climber name anna"
    );
  });

  it("falls back to the nearest approved future competition", async () => {
    getCompetitionsMock.mockResolvedValue([
      competition(4, "Far", "2026-08-01"),
      competition(5, "Near", "2026-06-20"),
      competition(6, "Unapproved", "2026-06-16"),
    ]);
    approveOnly(4, 5);
    renderActiveCompetition();

    expect(await screen.findByText("Near")).toBeInTheDocument();
    expect(screen.queryByText("Unapproved")).not.toBeInTheDocument();
  });

  it("treats a failed registration lookup as not registered", async () => {
    getCompetitionsMock.mockResolvedValue([competition(7, "Soon", "2026-06-18")]);
    getCompRegistrationInfoMock.mockRejectedValue(new Error("404"));
    renderActiveCompetition();

    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();
  });

  it("shows the empty text when there are no competitions", async () => {
    getCompetitionsMock.mockResolvedValue([]);
    renderActiveCompetition();

    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(getCompRegistrationInfoMock).not.toHaveBeenCalled();
  });

  it("shows an error when the competitions cannot be loaded", async () => {
    getCompetitionsMock.mockRejectedValue(new Error("boom"));
    renderActiveCompetition();

    expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument();
    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
  });

  it("shows an error and no competition when the user info cannot be loaded", async () => {
    getMyInfoMock.mockRejectedValue(new Error("boom"));
    getCompetitionsMock.mockResolvedValue([competition(3, "Today", "2026-06-15")]);
    approveOnly(3);
    renderActiveCompetition();

    expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument();
    expect(screen.queryByTestId("competition-scores")).not.toBeInTheDocument();
  });
});
