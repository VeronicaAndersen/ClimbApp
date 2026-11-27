import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ProblemStats, StatsClimber } from "@/types";
import { ProblemStatsTable } from "@/components/admin/ProblemStatsTable";
import { getUserFriendlyError } from "@/utils/errorMessages";
import { createTestQueryClient } from "@/Tests/utils/renderWithQueryClient";

const { getLevelStatsMock } = vi.hoisted(() => ({ getLevelStatsMock: vi.fn() }));
vi.mock("@/services/api", () => ({ getLevelStats: getLevelStatsMock }));

const problem = (
  problem_no: number,
  topPct: number,
  bonusPct: number,
  climbers: Pick<ProblemStats, "got_top_climbers" | "got_bonus_climbers"> = {
    got_top_climbers: [],
    got_bonus_climbers: [],
  }
): ProblemStats => ({
  problem_no,
  total_competitors: 10,
  got_top_count: topPct / 10,
  got_bonus_count: bonusPct / 10,
  got_top_percentage: topPct,
  got_bonus_percentage: bonusPct,
  ...climbers,
});

const anna: StatsClimber = { id: 1, username: "anna_k", firstname: "Anna", lastname: "Karlsson" };
const bo: StatsClimber = { id: 2, username: "bo99", firstname: null, lastname: null };
const cecilia: StatsClimber = { id: 3, username: "cissi", firstname: "Cecilia", lastname: null };

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

  it("lists the climbers who got top when the Topp cell is clicked", async () => {
    getLevelStatsMock.mockResolvedValue({
      level: 3,
      problems: [
        problem(1, 10, 10, { got_top_climbers: [cecilia], got_bonus_climbers: [cecilia] }),
        problem(3, 20, 30, {
          got_top_climbers: [anna, bo],
          got_bonus_climbers: [anna, bo, cecilia],
        }),
      ],
    });
    renderTable();

    await userEvent.click(
      await screen.findByRole("button", { name: /– Visa vem som klarat topp på problem 3$/ })
    );

    const dialog = await screen.findByRole("dialog", { name: "Problem 3 – Topp (2)" });
    const items = within(dialog).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["Anna Karlssonanna_k", "bo99"]);
    expect(within(dialog).queryByText("Cecilia")).not.toBeInTheDocument();
  });

  it("lists the climbers who got bonus when the Bonus cell is clicked", async () => {
    getLevelStatsMock.mockResolvedValue({
      level: 3,
      problems: [
        problem(3, 10, 30, { got_top_climbers: [anna], got_bonus_climbers: [anna, bo, cecilia] }),
      ],
    });
    renderTable();

    await userEvent.click(
      await screen.findByRole("button", { name: /– Visa vem som klarat bonus på problem 3$/ })
    );

    const dialog = await screen.findByRole("dialog", { name: "Problem 3 – Bonus (3)" });
    expect(within(dialog).getByText("Anna Karlsson")).toBeInTheDocument();
    expect(within(dialog).getByText("bo99")).toBeInTheDocument();
    expect(within(dialog).getByText("Cecilia")).toBeInTheDocument();
    expect(within(dialog).getByText("cissi")).toBeInTheDocument();
  });

  it("says that nobody has got top or bonus yet when the list is empty", async () => {
    getLevelStatsMock.mockResolvedValue({ level: 3, problems: [problem(2, 0, 0)] });
    renderTable();

    await userEvent.click(
      await screen.findByRole("button", { name: /– Visa vem som klarat topp på problem 2$/ })
    );
    const topDialog = await screen.findByRole("dialog", { name: "Problem 2 – Topp (0)" });
    expect(within(topDialog).getByText("Ingen har klarat topp ännu.")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(
      screen.getByRole("button", { name: /– Visa vem som klarat bonus på problem 2$/ })
    );
    const bonusDialog = await screen.findByRole("dialog", { name: "Problem 2 – Bonus (0)" });
    expect(within(bonusDialog).getByText("Ingen har klarat bonus ännu.")).toBeInTheDocument();
  });
});
