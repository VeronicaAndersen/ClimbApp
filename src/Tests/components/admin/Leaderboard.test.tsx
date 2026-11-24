import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import type {
  CompetitionResponse,
  LeaderboardResponse,
  SeasonResponse,
  SeasonStandingsResponse,
} from "@/types";
import { Leaderboard } from "@/components/admin/Leaderboard";
import { createTestQueryClient } from "@/Tests/utils/renderWithQueryClient";

const { getCompetitionsMock, getLeaderboardMock, getSeasonsMock, getSeasonStandingsMock } =
  vi.hoisted(() => ({
    getCompetitionsMock: vi.fn(),
    getLeaderboardMock: vi.fn(),
    getSeasonsMock: vi.fn(),
    getSeasonStandingsMock: vi.fn(),
  }));

vi.mock("@/services/api", () => ({
  getCompetitions: getCompetitionsMock,
  getLeaderboard: getLeaderboardMock,
  getSeasons: getSeasonsMock,
  getSeasonStandings: getSeasonStandingsMock,
}));

const competition = (id: number, name: string): CompetitionResponse => ({
  id,
  name,
  description: "",
  comp_type: "cup",
  comp_date: "2026-04-01",
  season_id: 1,
  round_no: null,
});

const season: SeasonResponse = {
  id: 3,
  name: "Säsong 26",
  year: 2026,
  created_at: "2026-01-01T00:00:00Z",
};

const leaderboard: LeaderboardResponse = {
  competition_id: 7,
  levels: [
    { level: 2, entries: [{ rank: 1, name: "Anna", total_score: 12.5 }] },
    {
      level: 4,
      entries: [
        { rank: 1, name: "Bo", total_score: 30 },
        { rank: 4, name: "Cia", total_score: 8 },
      ],
    },
  ],
};

const standings: SeasonStandingsResponse = {
  season_id: 3,
  season_name: "Säsong 26",
  levels: [{ level: 1, entries: [{ rank: 2, name: "Dan", total_score: 44 }] }],
};

function renderLeaderboard() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Leaderboard />
    </QueryClientProvider>
  );
}

describe("Leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCompetitionsMock.mockResolvedValue([
      competition(7, "Vårcupen"),
      competition(8, "Höstcupen"),
    ]);
    getLeaderboardMock.mockResolvedValue(leaderboard);
    getSeasonsMock.mockResolvedValue([season]);
    getSeasonStandingsMock.mockResolvedValue(standings);
  });

  it("shows the first level of the picked competition and switches level", async () => {
    renderLeaderboard();

    const select = await screen.findByRole("combobox");
    expect(screen.getByRole("option", { name: "Vårcupen (2026-04-01)" })).toBeInTheDocument();
    expect(getLeaderboardMock).not.toHaveBeenCalled();

    await userEvent.selectOptions(select, "7");
    expect(await screen.findByText("Anna")).toBeInTheDocument();
    expect(getLeaderboardMock).toHaveBeenCalledWith(7);
    expect(screen.getByText("12.5")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Poäng" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Grad 4" }));
    expect(screen.getByText("Bo")).toBeInTheDocument();
    expect(screen.getByText("Cia")).toBeInTheDocument();
    expect(screen.queryByText("Anna")).not.toBeInTheDocument();
  });

  it("resets to the first level when another competition is picked", async () => {
    renderLeaderboard();
    const select = await screen.findByRole("combobox");

    await userEvent.selectOptions(select, "7");
    await userEvent.click(await screen.findByRole("button", { name: "Grad 4" }));
    expect(screen.getByText("Bo")).toBeInTheDocument();

    getLeaderboardMock.mockResolvedValue({ ...leaderboard, competition_id: 8 });
    await userEvent.selectOptions(select, "8");
    expect(await screen.findByText("Anna")).toBeInTheDocument();
    expect(screen.queryByText("Bo")).not.toBeInTheDocument();
  });

  it("hides the board when the placeholder is picked again", async () => {
    renderLeaderboard();
    const select = await screen.findByRole("combobox");

    await userEvent.selectOptions(select, "7");
    expect(await screen.findByText("Anna")).toBeInTheDocument();

    await userEvent.selectOptions(select, "");
    expect(screen.queryByText("Anna")).not.toBeInTheDocument();
  });

  it("shows an empty message when the competition has no results", async () => {
    getLeaderboardMock.mockResolvedValue({ competition_id: 7, levels: [] });
    renderLeaderboard();

    await userEvent.selectOptions(await screen.findByRole("combobox"), "7");
    expect(
      await screen.findByText("Inga godkända resultat för denna tävling.")
    ).toBeInTheDocument();
  });

  it("shows an error when the competitions cannot be loaded", async () => {
    getCompetitionsMock.mockRejectedValue(new Error("boom"));
    renderLeaderboard();

    expect(await screen.findByText("Kunde inte hämta tävlingar.")).toBeInTheDocument();
  });

  it("shows an error when the leaderboard cannot be loaded", async () => {
    getLeaderboardMock.mockRejectedValue(new Error("boom"));
    renderLeaderboard();

    await userEvent.selectOptions(await screen.findByRole("combobox"), "7");
    expect(await screen.findByText("Kunde inte hämta resultatlista.")).toBeInTheDocument();
  });

  it("shows season standings in the season view", async () => {
    renderLeaderboard();
    await screen.findByRole("combobox");

    await userEvent.click(screen.getByRole("button", { name: "Säsong" }));
    const select = await screen.findByRole("combobox");
    expect(screen.getByRole("option", { name: "Säsong 26 (2026)" })).toBeInTheDocument();

    await userEvent.selectOptions(select, "3");
    expect(await screen.findByText("Dan")).toBeInTheDocument();
    expect(getSeasonStandingsMock).toHaveBeenCalledWith(3);
    expect(screen.getByRole("columnheader", { name: "Totalpoäng" })).toBeInTheDocument();
  });

  it("shows an error when the season standings cannot be loaded", async () => {
    getSeasonStandingsMock.mockRejectedValue(new Error("boom"));
    renderLeaderboard();
    await screen.findByRole("combobox");

    await userEvent.click(screen.getByRole("button", { name: "Säsong" }));
    await userEvent.selectOptions(await screen.findByRole("combobox"), "3");
    expect(await screen.findByText("Kunde inte hämta säsongsresultat.")).toBeInTheDocument();
  });
});
