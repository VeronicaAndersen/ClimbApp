import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { ScoreBatchResponse } from "@/types";
import ProblemGrid from "@/components/ProblemGrid";

const { saveAllMock, saveAllBatchMock, batchState } = vi.hoisted(() => ({
  saveAllMock: vi.fn(),
  saveAllBatchMock: vi.fn(),
  batchState: { error: null as string | null, problemErrors: {} as Record<number, string> },
}));
vi.mock("@/hooks/useUpdateScore", () => ({
  useUpdateScore: () => ({ saving: false, error: null, saveMessage: null, saveAll: saveAllMock }),
}));
vi.mock("@/hooks/useUpdateScoreBatchResult", () => ({
  useUpdateScoreBatch: () => ({
    saving: false,
    error: batchState.error,
    problemErrors: batchState.problemErrors,
    saveMessage: null,
    saveAll: saveAllBatchMock,
  }),
}));

const TODAY = "2026-05-10";
const LATER = "2026-05-20";

const emptyScore = {
  attempts_total: 0,
  got_bonus: false,
  got_top: false,
  attempts_to_bonus: 0,
  attempts_to_top: 0,
};

const initial: ScoreBatchResponse[] = [
  { problem_no: 1, score: { ...emptyScore } },
  { problem_no: 2, score: { ...emptyScore } },
];

interface HarnessProps {
  competitionDate?: string;
  userScope?: string;
  onHasChangesChange?: (hasChanges: boolean) => void;
}

function Harness({
  competitionDate = TODAY,
  userScope = "climber",
  onHasChangesChange,
}: HarnessProps) {
  const [problems, setProblems] = useState(initial);
  const [initialProblems, setInitialProblems] = useState(initial);
  return (
    <ProblemGrid
      competitionId={3}
      competitionDate={competitionDate}
      userScope={userScope}
      problems={problems}
      initialProblems={initialProblems}
      setProblems={setProblems}
      setInitialProblems={setInitialProblems}
      gradeLevel={4}
      onHasChangesChange={onHasChangesChange}
    />
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
  saveAllMock.mockReset().mockResolvedValue(true);
  saveAllBatchMock.mockReset().mockResolvedValue(true);
  batchState.error = null;
  batchState.problemErrors = {};
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ProblemGrid", () => {
  it("renders one card per problem", () => {
    render(<Harness />);

    expect(screen.getByRole("heading", { name: "Problem 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Problem 2" })).toBeInTheDocument();
    // The floating save bar stays hidden until there is something to save.
    expect(screen.queryByRole("button", { name: "Spara alla ändringar" })).not.toBeInTheDocument();
  });

  it("marks an edited problem and saves all changes in one batch", async () => {
    const onHasChangesChange = vi.fn();
    render(<Harness onHasChangesChange={onHasChangesChange} />);

    await userEvent.click(screen.getAllByRole("button", { name: "Öka Antal försök" })[0]);

    expect(screen.getByText("Ej sparad")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Antal försök", { selector: "#problem-1-attempts_total" })
    ).toHaveValue(1);
    expect(onHasChangesChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByText("1 osparat problem")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Spara alla ändringar" }));

    expect(saveAllBatchMock).toHaveBeenCalledWith(3, 4, [
      { problem_no: 1, score: { ...emptyScore, attempts_total: 1 } },
      { problem_no: 2, score: { ...emptyScore } },
    ]);
    await waitFor(() => expect(screen.queryByText("Ej sparad")).not.toBeInTheDocument());
    expect(onHasChangesChange).toHaveBeenLastCalledWith(false);
  });

  it("saves a single problem", async () => {
    render(<Harness />);

    await userEvent.click(screen.getAllByRole("button", { name: "Öka Bonus" })[1]);
    await userEvent.click(screen.getAllByRole("button", { name: "Spara försök för dig" })[1]);

    expect(saveAllMock).toHaveBeenCalledWith(3, 4, 2, { ...emptyScore, attempts_to_bonus: 1 });
    await waitFor(() => expect(screen.queryByText("Ej sparad")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Spara alla ändringar" })).not.toBeInTheDocument();
  });

  it("locks editing before the competition day for climbers", () => {
    render(<Harness competitionDate={LATER} />);

    expect(screen.getByText("Tävlingen har inte öppnat ännu.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aktivera" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Öka Topp" })[0]).toBeDisabled();
  });

  it("lets admins unlock editing outside the competition day", async () => {
    render(<Harness competitionDate={LATER} userScope="admin" />);

    expect(screen.getAllByRole("button", { name: "Redigering inaktiverad" })).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: "Aktivera" }));

    expect(screen.getByRole("button", { name: "Inaktivera" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Öka Topp" })[0]).toBeEnabled();

    await userEvent.click(screen.getAllByRole("button", { name: "Öka Topp" })[0]);
    expect(screen.getByRole("button", { name: "Spara alla ändringar" })).toBeEnabled();
  });

  it("collapses a problem when its header is clicked", async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole("heading", { name: "Problem 1" }));

    expect(screen.getAllByRole("button", { name: "Öka Topp" })).toHaveLength(1);
  });

  it("marks the problem that failed a batch save and says why", () => {
    batchState.error = "Kunde inte spara problem 2. Inget sparades.";
    batchState.problemErrors = { 2: "Ange antal försök till topp när toppen är tagen." };
    render(<Harness />);

    expect(screen.getByText("Kunde inte spara problem 2. Inget sparades.")).toBeInTheDocument();
    expect(
      screen.getByText("Ange antal försök till topp när toppen är tagen.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Kunde inte sparas")).toHaveLength(1);
    expect(document.getElementById("problem-card-2")).toHaveTextContent("Kunde inte sparas");
  });
});
