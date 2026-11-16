import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/apiError";
import { SessionSwitcher } from "../../components/SessionSwitcher";

const { loginClimberMock, getMyInfoMock } = vi.hoisted(() => ({
  loginClimberMock: vi.fn(),
  getMyInfoMock: vi.fn(),
}));
vi.mock("@/services/api", () => ({
  loginClimber: loginClimberMock,
  getMyInfo: getMyInfoMock,
}));

beforeEach(() => {
  loginClimberMock.mockReset();
  getMyInfoMock.mockReset().mockResolvedValue(null);
  localStorage.clear();
});

async function submitAddLogin(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Lägg till" }));
  await user.type(screen.getByLabelText("Användarnamn"), "alice");
  await user.type(screen.getByLabelText("Lösenord"), "wrong-password");
  await user.click(screen.getByRole("button", { name: "Logga in" }));
}

describe("SessionSwitcher login errors", () => {
  it("announces the error as an alert linked to the inputs", async () => {
    loginClimberMock.mockRejectedValue(
      new ApiError({ status: 401, message: "Invalid credentials", detail: "Invalid credentials" })
    );
    const user = userEvent.setup();
    render(<SessionSwitcher onSwitch={vi.fn()} />);

    await submitAddLogin(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Felaktigt användarnamn eller lösenord."
    );
    for (const label of ["Användarnamn", "Lösenord"]) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription("Felaktigt användarnamn eller lösenord.");
    }
  });

  it("disables login for the Retry-After wait after a 429", async () => {
    loginClimberMock.mockRejectedValue(
      new ApiError({ status: 429, message: "x", retryAfterSeconds: 120 })
    );
    const user = userEvent.setup();
    render(<SessionSwitcher onSwitch={vi.fn()} />);

    await submitAddLogin(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "För många försök. Försök igen om ungefär 2 minuter."
    );
    expect(screen.getByRole("button", { name: "Logga in" })).toBeDisabled();
  });
});
