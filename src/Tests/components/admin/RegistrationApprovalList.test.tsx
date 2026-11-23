import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { Theme } from "@radix-ui/themes";
import type { RegistrationWithClimber } from "@/types";
import { RegistrationApprovalList } from "../../../components/admin/RegistrationApprovalList";
import { createTestQueryClient } from "../../utils/renderWithQueryClient";

const { getAllRegistrationsMock, updateApprovalMock, updateLevelMock } = vi.hoisted(() => ({
  getAllRegistrationsMock: vi.fn(),
  updateApprovalMock: vi.fn(),
  updateLevelMock: vi.fn(),
}));
vi.mock("@/services/api", () => ({
  getAllRegistrations: getAllRegistrationsMock,
  updateRegistrationApproval: updateApprovalMock,
  updateRegistrationLevel: updateLevelMock,
}));

const pending: RegistrationWithClimber = {
  comp_id: 3,
  user_id: 7,
  level: 2,
  approved: false,
  created_at: "2026-01-01T10:00:00Z",
  climber_name: "Blomma Gren",
};

function renderList() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Theme>
        <RegistrationApprovalList competitionId={3} />
      </Theme>
    </QueryClientProvider>
  );
}

const climberRow = () => screen.getByText("Blomma Gren").closest("tr") as HTMLElement;

beforeEach(() => {
  getAllRegistrationsMock.mockReset().mockResolvedValue([pending]);
  updateApprovalMock.mockReset().mockResolvedValue(null);
  updateLevelMock.mockReset().mockResolvedValue(null);
});

describe("RegistrationApprovalList", () => {
  it("lists the competition's registrations", async () => {
    renderList();

    expect(await screen.findByText("Blomma Gren")).toBeInTheDocument();
    expect(within(climberRow()).getByText("Väntar")).toBeInTheDocument();
    expect(getAllRegistrationsMock).toHaveBeenCalledWith(3);
  });

  it("shows the empty state when nobody is registered", async () => {
    getAllRegistrationsMock.mockResolvedValue([]);
    renderList();

    expect(await screen.findByText("Inga anmälda för denna tävling.")).toBeInTheDocument();
  });

  it("shows an error when the registrations cannot be fetched", async () => {
    getAllRegistrationsMock.mockRejectedValue(new Error("Failed to fetch"));
    renderList();

    expect(
      await screen.findByText(
        "Kunde inte ansluta till servern. Kontrollera din internetanslutning."
      )
    ).toBeInTheDocument();
  });

  it("marks a registration approved without refetching", async () => {
    renderList();
    await screen.findByText("Blomma Gren");

    await userEvent.click(within(climberRow()).getByRole("button"));

    expect(await within(climberRow()).findByText("Godkänd")).toBeInTheDocument();
    expect(updateApprovalMock).toHaveBeenCalledWith(3, 7, true);
    expect(getAllRegistrationsMock).toHaveBeenCalledTimes(1);
  });

  it("changes the level without refetching", async () => {
    renderList();
    await screen.findByText("Blomma Gren");

    await userEvent.selectOptions(within(climberRow()).getByRole("combobox"), "5");

    await waitFor(() => expect(within(climberRow()).getByRole("combobox")).toHaveValue("5"));
    expect(updateLevelMock).toHaveBeenCalledWith(3, 7, 5);
    expect(getAllRegistrationsMock).toHaveBeenCalledTimes(1);
  });

  // Known bug: the rollback refetch clears the error before anyone can read it.
  it.fails("shows the error and refetches when approval fails", async () => {
    updateApprovalMock.mockRejectedValue(new Error("Failed to fetch"));
    renderList();
    await screen.findByText("Blomma Gren");

    await userEvent.click(within(climberRow()).getByRole("button"));

    expect(
      await screen.findByText(
        "Kunde inte ansluta till servern. Kontrollera din internetanslutning."
      )
    ).toBeInTheDocument();
    await waitFor(() => expect(getAllRegistrationsMock).toHaveBeenCalledTimes(2));
    expect(within(climberRow()).getByText("Väntar")).toBeInTheDocument();
  });

  it("refetches when the refresh button is clicked", async () => {
    renderList();
    await screen.findByText("Blomma Gren");

    getAllRegistrationsMock.mockResolvedValue([{ ...pending, approved: true }]);
    const refresh = screen.getAllByRole("button")[0];
    await userEvent.click(refresh);

    expect(await within(climberRow()).findByText("Godkänd")).toBeInTheDocument();
    expect(getAllRegistrationsMock).toHaveBeenCalledTimes(2);
  });
});
