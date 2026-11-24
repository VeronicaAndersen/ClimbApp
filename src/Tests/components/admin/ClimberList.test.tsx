import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Theme } from "@radix-ui/themes";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ClimberResponse } from "@/types";
import { toApiError } from "@/lib/apiError";
import { ClimberList } from "../../../components/admin/ClimberList";
import { createTestQueryClient } from "../../utils/renderWithQueryClient";

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
    <QueryClientProvider client={createTestQueryClient()}>
      <Theme>
        <ClimberList />
      </Theme>
    </QueryClientProvider>
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

describe("ClimberList — API errors", () => {
  it("shows a 422 in Swedish, never the English pydantic text", async () => {
    const response = new Response(
      JSON.stringify({
        detail: [
          {
            loc: ["body", "email"],
            msg: "Value error, must not contain control or invisible formatting characters",
            type: "value_error",
          },
        ],
      }),
      { status: 422 }
    );
    updateClimberByIdMock.mockRejectedValue(await toApiError(response));
    const user = userEvent.setup();
    await startEditing(user);

    const firstname = screen.getByDisplayValue("Blomma");
    await user.clear(firstname);
    await user.type(firstname, "Blom");
    await user.click(save());

    expect(
      await screen.findByText("E-post får inte innehålla kontrolltecken eller osynliga tecken.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/Value error|must not contain/)).not.toBeInTheDocument();
  });

  it("shows an English 4xx detail through the Swedish translations", async () => {
    updateClimberByIdMock.mockRejectedValue(
      await toApiError(
        new Response(JSON.stringify({ detail: "Username is already taken" }), { status: 409 })
      )
    );
    const user = userEvent.setup();
    await startEditing(user);

    const username = screen.getByDisplayValue(LEGACY_USERNAME);
    await user.clear(username);
    await user.type(username, "upptagen");
    await user.click(save());

    expect(
      await screen.findByText("Användarnamnet är redan upptaget. Välj ett annat.")
    ).toBeInTheDocument();
  });
});
