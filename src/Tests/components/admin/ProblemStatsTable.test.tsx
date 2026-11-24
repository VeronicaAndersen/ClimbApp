import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ProblemStats } from "@/types";
import { ProblemStatsTable } from "@/components/admin/ProblemStatsTable";
import { getUserFriendlyError } from "@/utils/errorMessages";
import { createTestQueryClient } from "@/Tests/utils/renderWithQueryClient";

const { getLevelStatsMock } = vi.hoisted(() => ({ getLevelStatsMock: vi.fn() }));
vi.mock("@/services/api", () => ({ getLevelStats: getLevelStatsMock }));

const problem = (problem_no: number, topPct: number, bonusPct: number): ProblemStats => ({
  problem_no,
  total_competitors: 10,
  got_top_count: topPct / 10,
  got_bonus_count: bonusPct / 10,
  got_top_percentage: topPct,
  got_bonus_percentage: bonusPct,
});

function renderTable(compId = 7, level = 3) {
  const queryClient = createTestQueryClient();
  const ui = (c: number, l: number) => (
    <QueryClientProvider client={queryClient}>
      <ProblemStatsTable comp_id={c} level={l} />
    </QueryClientProvider>
  );
  const result = render(ui(compId, level));
  return { ...result, rerenderWith: (c: number, l: number) => result.rerender(ui(c, l)) };
}

/** Problem numbers in table order. */
function problemOrder(): string[] {
  const body = screen.getAllByRole("rowgroup")[1];
  return within(body)
    .getAllByRole("row")
    .map((row) => within(row).getAllByRole("cell")[0].textContent ?? "");
}

describe("ProblemStatsTable", () => {
  beforeEach(() => {
    getLevelStatsMock.mockReset();
  });

  it("loads the stats for the competition and level, sorted by problem", async () => {
    getLevelStatsMock.mockResolvedValue({
      level: 3,
      problems: [problem(2, 80, 90), problem(1, 20, 60)],
    });
    renderTable();

    expect(await screen.findByRole("button", { name: "Svårast (topp)" })).toBeInTheDocument();
    expect(getLevelStatsMock).toHaveBeenCalledWith({ comp_id: 7, level: 3 });
    expect(problemOrder()).toEqual(["1", "2"]);
  });

  it("sorts by the hardest problem", async () => {
    getLevelStatsMock.mockResolvedValue({
      level: 3,
      problems: [problem(1, 80, 30), problem(2, 20, 90)],
    });
    renderTable();

    await userEvent.click(await screen.findByRole("button", { name: "Svårast (topp)" }));
    expect(problemOrder()).toEqual(["2", "1"]);

    await userEvent.click(screen.getByRole("button", { name: "Svårast (bonus)" }));
    expect(problemOrder()).toEqual(["1", "2"]);
  });

  it("loads again when the level changes", async () => {
    getLevelStatsMock.mockResolvedValue({ level: 3, problems: [problem(1, 50, 50)] });
    const { rerenderWith } = renderTable();
    await screen.findByRole("button", { name: "Svårast (topp)" });

    getLevelStatsMock.mockResolvedValue({ level: 4, problems: [] });
    rerenderWith(7, 4);

    expect(await screen.findByText("Ingen statistik tillgänglig.")).toBeInTheDocument();
    expect(getLevelStatsMock).toHaveBeenLastCalledWith({ comp_id: 7, level: 4 });
  });

  it("shows a friendly error when the stats cannot be loaded", async () => {
    const err = new Error("Failed to fetch");
    getLevelStatsMock.mockRejectedValue(err);
    renderTable();

    expect(await screen.findByText(getUserFriendlyError(err))).toBeInTheDocument();
    expect(screen.getByText("Ingen statistik tillgänglig.")).toBeInTheDocument();
  });
});
