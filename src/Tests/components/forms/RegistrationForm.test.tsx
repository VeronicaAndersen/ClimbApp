import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Theme } from "@radix-ui/themes";
import * as api from "@/services/api";
import { ApiError } from "@/lib/apiError";
import { RegistrationForm } from "../../../components/forms/RegistrationForm";

function renderRegistrationForm() {
  return render(
    <MemoryRouter>
      <Theme>
        <RegistrationForm />
      </Theme>
    </MemoryRouter>
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function fillValidForm(user: User, overrides: { username?: string } = {}) {
  await user.type(screen.getByLabelText("Användarnamn"), overrides.username ?? "Alice");
  await user.type(screen.getByLabelText("Lösenord"), "secret123");
  await user.type(screen.getByLabelText("E-post"), "alice@example.com");
  await user.type(screen.getByLabelText("Förnamn"), "Alice");
  await user.type(screen.getByLabelText("Efternamn"), "Climber");
  await user.click(screen.getByRole("checkbox"));
}

const submitButton = () => screen.getByRole("button", { name: "Registrera dig" });

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("RegistrationForm — input rules", () => {
  it("limits username and password length", () => {
    renderRegistrationForm();
    expect(screen.getByLabelText("Användarnamn")).toHaveAttribute("maxLength", "200");
    expect(screen.getByLabelText("Lösenord")).toHaveAttribute("maxLength", "1024");
  });

  it("explains a too short password", async () => {
    const user = userEvent.setup();
    renderRegistrationForm();

    await user.type(screen.getByLabelText("Lösenord"), "abc");

    expect(screen.getByLabelText("Lösenord")).toHaveAccessibleDescription(
      "Lösenordet måste innehålla minst 6 tecken."
    );
  });

  it("sends the trimmed, lowercased username", async () => {
    const signup = vi.spyOn(api, "signupClimber").mockResolvedValue(null);
    const user = userEvent.setup();
    renderRegistrationForm();

    await fillValidForm(user, { username: "  Alice  " });
    await user.click(submitButton());

    expect(signup).toHaveBeenCalledWith(expect.objectContaining({ username: "alice" }));
  });

  it("blocks invisible characters in the username", async () => {
    const user = userEvent.setup();
    renderRegistrationForm();

    await fillValidForm(user, { username: "ali\u202Ece" });

    expect(
      screen.getByText("Användarnamnet får inte innehålla kontrolltecken eller osynliga tecken.")
    ).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it("blocks control characters in the club", async () => {
    const user = userEvent.setup();
    renderRegistrationForm();

    await fillValidForm(user);
    await user.click(screen.getByLabelText("Klubb (valfritt)"));
    await user.paste("Grepp\u0000");

    expect(screen.getByLabelText("Klubb (valfritt)")).toHaveAccessibleDescription(
      "Klubb får inte innehålla kontrolltecken."
    );
    expect(submitButton()).toBeDisabled();
  });

  it("enables submit once everything is valid", async () => {
    const user = userEvent.setup();
    renderRegistrationForm();

    await fillValidForm(user);

    expect(submitButton()).toBeEnabled();
  });
});

describe("RegistrationForm — API errors", () => {
  it("shows a 429 wait and disables submit", async () => {
    vi.spyOn(api, "signupClimber").mockRejectedValue(
      new ApiError({ status: 429, message: "x", retryAfterSeconds: 60 })
    );
    const user = userEvent.setup();
    renderRegistrationForm();

    await fillValidForm(user);
    await user.click(submitButton());

    expect(
      await screen.findByText("För många försök. Försök igen om ungefär 1 minut.")
    ).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it("translates a taken username", async () => {
    vi.spyOn(api, "signupClimber").mockRejectedValue(
      new ApiError({ status: 409, message: "Username is already taken" })
    );
    const user = userEvent.setup();
    renderRegistrationForm();

    await fillValidForm(user);
    await user.click(submitButton());

    expect(
      await screen.findByText("Användarnamnet är redan upptaget. Välj ett annat.")
    ).toBeInTheDocument();
  });
});
