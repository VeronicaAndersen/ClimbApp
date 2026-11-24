import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ClimberResponse, RegistrationWithCompetition } from "@/types";
import { ClimberStatsModal } from "@/components/admin/ClimberStatsModal";
import { getUserFriendlyError } from "@/utils/errorMessages";
import { createTestQueryClient } from "@/Tests/utils/renderWithQueryClient";

const { getClimberRegistrationsMock, getUserScoresBatchMock } = vi.hoisted(() => ({
  getClimberRegistrationsMock: vi.fn(),
  getUserScoresBatchMock: vi.fn(),
}));
vi.mock("@/services/api", () => ({
  getClimberRegistrations: getClimberRegistrationsMock,
  getUserScoresBatch: getUserScoresBatchMock,
}));
vi.mock("@/components/ScoreSummary", () => ({
  default: ({ problems, gradeLevel }: { problems: unknown[]; gradeLevel: number }) => (
    <div data-testid="score-summary">
      {problems.length} problems level {gradeLevel}
    </div>
  ),
}));

const climber = (id: number, firstname: string) =>
  ({ id, username: firstname.toLowerCase(), firstname, lastname: "" }) as ClimberResponse;

const registration = (
  comp_id: number,
  competition_name: string,
  level: number
): RegistrationWithCompetition => ({
  comp_id,
  competition_name,
  comp_date: "2026-04-01",
  level,
  approved: true,
  created_at: "2026-03-01",
});

const score = (problem_no: number) => ({
  problem_no,
  score: {
    attempts_total: 3,
    got_bonus: true,
    attempts_to_bonus: 2,
    got_top: false,
    attempts_to_top: 0,
  },
});

function renderModal(initial: ClimberResponse | null) {
  const queryClient = createTestQueryClient();
  const ui = (c: ClimberResponse | null) => (
    <QueryClientProvider client={queryClient}>
      <ClimberStatsModal climber={c} onClose={() => {}} />
    </QueryClientProvider>
  );
  const result = render(ui(initial));
  return { ...result, rerenderWith: (c: ClimberResponse | null) => result.rerender(ui(c)) };
}

describe("ClimberStatsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClimberRegistrationsMock.mockResolvedValue([
      registration(1, "Vårcupen", 2),
      registration(2, "Höstcupen", 5),
    ]);
    getUserScoresBatchMock.mockResolvedValue([score(1), score(2)]);
  });

  it("does not load anything while closed", () => {
    renderModal(null);

    expect(getClimberRegistrationsMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the scores of the first competition, then of the one picked", async () => {
    renderModal(climber(9, "Anna"));

    expect(await screen.findByTestId("score-summary")).toHaveTextContent("2 problems level 2");
    expect(getClimberRegistrationsMock).toHaveBeenCalledWith(9);
    expect(getUserScoresBatchMock).toHaveBeenCalledWith({ comp_id: 1, level: 2 }, 9);

    getUserScoresBatchMock.mockResolvedValue([score(1)]);
    await userEvent.click(screen.getByRole("button", { name: /Höstcupen/ }));

    expect(await screen.findByText("1 problems level 5")).toBeInTheDocument();
    expect(getUserScoresBatchMock).toHaveBeenLastCalledWith({ comp_id: 2, level: 5 }, 9);
  });

  it("starts at the first competition again for another climber", async () => {
    const { rerenderWith } = renderModal(climber(9, "Anna"));
    await userEvent.click(await screen.findByRole("button", { name: /Höstcupen/ }));
    expect(await screen.findByText("2 problems level 5")).toBeInTheDocument();

    getClimberRegistrationsMock.mockResolvedValue([
      registration(3, "Sommarcupen", 1),
      registration(2, "Höstcupen", 5),
    ]);
    rerenderWith(climber(10, "Bo"));

    expect(await screen.findByText("2 problems level 1")).toBeInTheDocument();
    expect(getUserScoresBatchMock).toHaveBeenLastCalledWith({ comp_id: 3, level: 1 }, 10);
  });

  it("starts at the first competition again when reopened", async () => {
    const anna = climber(9, "Anna");
    const { rerenderWith } = renderModal(anna);
    await userEvent.click(await screen.findByRole("button", { name: /Höstcupen/ }));
    expect(await screen.findByText("2 problems level 5")).toBeInTheDocument();

    rerenderWith(null);
    rerenderWith(anna);

    expect(await screen.findByText("2 problems level 2")).toBeInTheDocument();
  });

  it("says so when the climber has no registrations", async () => {
    getClimberRegistrationsMock.mockResolvedValue([]);
    renderModal(climber(9, "Anna"));

    expect(
      await screen.findByText("Klättraren är inte anmäld till några tävlingar.")
    ).toBeInTheDocument();
    expect(getUserScoresBatchMock).not.toHaveBeenCalled();
  });

  it("shows a friendly error when the registrations cannot be loaded", async () => {
    const err = new Error("Failed to fetch");
    getClimberRegistrationsMock.mockRejectedValue(err);
    renderModal(climber(9, "Anna"));

    expect(await screen.findByText(getUserFriendlyError(err))).toBeInTheDocument();
  });

  it("shows a friendly error when the scores cannot be loaded", async () => {
    const err = new Error("Failed to fetch");
    getUserScoresBatchMock.mockRejectedValue(err);
    renderModal(climber(9, "Anna"));

    expect(await screen.findByText(getUserFriendlyError(err))).toBeInTheDocument();
  });
});
