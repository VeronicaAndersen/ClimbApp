import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Theme } from "@radix-ui/themes";
import type { ClimberResponse } from "@/types";
import { ClimberList } from "../../../components/admin/ClimberList";

const { useClimbersMock, updateClimberByIdMock } = vi.hoisted(() => ({
  useClimbersMock: vi.fn(),
  updateClimberByIdMock: vi.fn(),
}));
vi.mock("@/hooks/useClimbers", () => ({ useClimbers: useClimbersMock }));
vi.mock("@/services/api", () => ({
  updateClimberById: updateClimberByIdMock,
  deleteClimberById: vi.fn(),
}));

const LEGACY_USERNAME = "blomma \u{1F338}";

const legacyClimber: ClimberResponse = {
  id: 7,
  username: LEGACY_USERNAME,
  user_scope: "climber",
  created_at: "2026-01-01",
  email: "blomma@example.com",
  firstname: "Blomma",
  lastname: "Gren",
  club: "",
};

beforeEach(() => {
  updateClimberByIdMock.mockReset().mockResolvedValue(null);
  useClimbersMock.mockReturnValue({
    climbers: [legacyClimber],
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
});

async function startEditing(user: ReturnType<typeof userEvent.setup>) {
  render(
    <Theme>
      <ClimberList />
    </Theme>
  );
  await user.click(screen.getByRole("button", { name: `Redigera ${LEGACY_USERNAME}` }));
}

const save = () => screen.getByRole("button", { name: "Spara ändringar" });

describe("ClimberList — username changes", () => {
  it("neither validates nor sends an unchanged legacy username", async () => {
    const user = userEvent.setup();
    await startEditing(user);

    const firstname = screen.getByDisplayValue("Blomma");
    await user.clear(firstname);
    await user.type(firstname, "Blom");
    await user.click(save());

    expect(updateClimberByIdMock).toHaveBeenCalledTimes(1);
    expect(updateClimberByIdMock.mock.calls[0][1]).not.toHaveProperty("username");
  });

  it("validates a changed username with the new-username rule", async () => {
    const user = userEvent.setup();
    await startEditing(user);

    const username = screen.getByDisplayValue(LEGACY_USERNAME);
    await user.clear(username);
    await user.type(username, "ny  blomma");
    await user.click(save());

    expect(
      await screen.findByText(
        "Användarnamnet får inte börja eller sluta med mellanslag eller ha två mellanslag i rad."
      )
    ).toBeInTheDocument();
    expect(updateClimberByIdMock).not.toHaveBeenCalled();
  });

  it("sends a changed username in its normalized form", async () => {
    const user = userEvent.setup();
    await startEditing(user);

    const username = screen.getByDisplayValue(LEGACY_USERNAME);
    await user.clear(username);
    await user.type(username, "  Ny Blomma ");
    await user.click(save());

    expect(updateClimberByIdMock).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ username: "ny blomma" })
    );
  });
});
