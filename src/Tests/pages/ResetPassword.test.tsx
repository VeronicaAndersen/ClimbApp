import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Theme } from "@radix-ui/themes";
import * as api from "@/services/api";
import { ApiError } from "@/lib/apiError";
import ResetPassword from "../../pages/ResetPassword";

function renderResetPassword() {
  return render(
    <MemoryRouter initialEntries={["/reset-password?token=abc123"]}>
      <Theme>
        <ResetPassword />
      </Theme>
    </MemoryRouter>
  );
}

async function submitNewPassword(user: ReturnType<typeof userEvent.setup>, password: string) {
  await user.type(screen.getByLabelText("Nytt lösenord"), password);
  await user.type(screen.getByLabelText("Bekräfta lösenord"), password);
  await user.click(screen.getByRole("button", { name: "Spara nytt lösenord" }));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ResetPassword", () => {
  it("explains an invalid or expired token in Swedish", async () => {
    vi.spyOn(api, "confirmPasswordReset").mockRejectedValue(
      new ApiError({
        status: 400,
        message: "Invalid or expired reset token",
        detail: "Invalid or expired reset token",
      })
    );
    const user = userEvent.setup();
    renderResetPassword();

    await submitNewPassword(user, "secret123");

    expect(
      await screen.findByText(
        "Återställningslänken är ogiltig eller har gått ut. Begär en ny länk."
      )
    ).toBeInTheDocument();
  });

  it("shows the wait and disables submit after a 429", async () => {
    vi.spyOn(api, "confirmPasswordReset").mockRejectedValue(
      new ApiError({ status: 429, message: "x", retryAfterSeconds: 120 })
    );
    const user = userEvent.setup();
    renderResetPassword();

    await submitNewPassword(user, "secret123");

    expect(
      await screen.findByText("För många försök. Försök igen om ungefär 2 minuter.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spara nytt lösenord" })).toBeDisabled();
  });
});
