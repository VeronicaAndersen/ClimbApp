import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Theme } from "@radix-ui/themes";
import type { MyInfoResponse } from "@/types";
import { CompleteProfileForm } from "../../../components/forms/CompleteProfileForm";

const { updateMyInfoMock } = vi.hoisted(() => ({ updateMyInfoMock: vi.fn() }));
vi.mock("@/services/api", () => ({ updateMyInfo: updateMyInfoMock }));

const incompleteUser: MyInfoResponse = {
  id: 1,
  username: "alice",
  user_scope: "climber",
  created_at: "2026-01-01",
  email: "",
  firstname: "",
  lastname: "",
  club: "",
};

function renderForm() {
  return render(
    <Theme>
      <CompleteProfileForm userInfo={incompleteUser} onComplete={vi.fn()} />
    </Theme>
  );
}

beforeEach(() => {
  updateMyInfoMock.mockReset();
});

describe("CompleteProfileForm — input rules", () => {
  it("blocks control characters in the last name", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("E-post *"), "alice@example.com");
    await user.type(screen.getByLabelText("Förnamn *"), "Alice");
    await user.click(screen.getByLabelText("Efternamn *"));
    await user.paste("Clim\u0008ber");
    await user.click(screen.getByRole("checkbox"));

    expect(screen.getByLabelText("Efternamn *")).toHaveAccessibleDescription(
      "Efternamn får inte innehålla kontrolltecken."
    );
    expect(screen.getByRole("button", { name: "Spara profil" })).toBeDisabled();
  });

  it("submits valid values", async () => {
    updateMyInfoMock.mockResolvedValue(null);
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("E-post *"), "alice@example.com");
    await user.type(screen.getByLabelText("Förnamn *"), "Alice");
    await user.type(screen.getByLabelText("Efternamn *"), "Climber");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Spara profil" }));

    expect(updateMyInfoMock).toHaveBeenCalledWith({
      email: "alice@example.com",
      firstname: "Alice",
      lastname: "Climber",
    });
  });
});
