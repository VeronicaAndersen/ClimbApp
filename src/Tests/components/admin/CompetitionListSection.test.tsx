import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { Theme } from "@radix-ui/themes";
import type { CompetitionResponse } from "@/types";
import { CompetitionListSection } from "../../../components/admin/CompetitionListSection";
import { createTestQueryClient } from "../../utils/renderWithQueryClient";

const { getCompetitionsMock } = vi.hoisted(() => ({ getCompetitionsMock: vi.fn() }));
vi.mock("@/services/api", () => ({
  getCompetitions: getCompetitionsMock,
  getAllRegistrations: vi.fn().mockResolvedValue([]),
  updateRegistrationApproval: vi.fn(),
  updateRegistrationLevel: vi.fn(),
}));

const competition = (id: number, comp_date: string) =>
  ({ id, name: `Tävling ${id}`, comp_date, comp_type: "QUALIFIER" }) as CompetitionResponse;

function renderSection(queryClient = createTestQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <Theme>
        <CompetitionListSection refreshKey={0} />
      </Theme>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getCompetitionsMock.mockReset();
});

describe("CompetitionListSection", () => {
  it("lists upcoming competitions and folds past ones away", async () => {
    getCompetitionsMock.mockResolvedValue([
      competition(1, "2000-01-01"),
      competition(2, "2999-01-01"),
    ]);
    renderSection();

    expect(await screen.findByText("Tävling 2")).toBeVisible();
    expect(screen.getByText("Visa tidigare tävlingar (1)")).toBeInTheDocument();
  });

  it("keeps the list when a later refetch of the shared query fails", async () => {
    getCompetitionsMock.mockResolvedValue([competition(2, "2999-01-01")]);
    const queryClient = createTestQueryClient();
    renderSection(queryClient);
    await screen.findByText("Tävling 2");

    getCompetitionsMock.mockRejectedValue(new Error("Failed to fetch"));
    await act(() => queryClient.refetchQueries({ queryKey: ["competitions"] }));
    expect(queryClient.getQueryState(["competitions", 0])?.status).toBe("error");
    // Let the observer's batched notification re-render the section.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(screen.getByText("Tävling 2")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("offers a retry when the competitions cannot be fetched", async () => {
    getCompetitionsMock.mockRejectedValueOnce(new Error("Failed to fetch"));
    getCompetitionsMock.mockResolvedValue([competition(2, "2999-01-01")]);
    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Försök igen" }));

    expect(await screen.findByText("Tävling 2")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
