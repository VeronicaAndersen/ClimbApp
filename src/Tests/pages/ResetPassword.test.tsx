import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
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

describe("ResetPassword — token in the URL", () => {
  function renderInBrowser(url: string) {
    window.history.replaceState(null, "", url);
    return render(
      <BrowserRouter>
        <Theme>
          <Routes>
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </Theme>
      </BrowserRouter>
    );
  }

  it("removes the token from the address bar without a new history entry", async () => {
    const historyLength = window.history.length;
    const confirm = vi.spyOn(api, "confirmPasswordReset").mockResolvedValue({ message: "ok" });
    const user = userEvent.setup();

    renderInBrowser("/reset-password?token=secret-token");

    expect(window.location.pathname).toBe("/reset-password");
    expect(window.location.search).toBe("");
    expect(window.location.href).not.toContain("secret-token");
    expect(window.history.length).toBe(historyLength);

    // The form still uses the token it read before the URL was cleaned.
    await submitNewPassword(user, "secret123");
    expect(confirm).toHaveBeenCalledWith({ token: "secret-token", new_password: "secret123" });
  });

  it("still reports a missing token", () => {
    renderInBrowser("/reset-password");

    expect(screen.getByText("Ogiltig återställningslänk")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Spara nytt lösenord" })).not.toBeInTheDocument();
  });
});

describe("ResetPassword — redirect after success", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function renderWithLoginRoute() {
    return render(
      <MemoryRouter initialEntries={["/reset-password?token=abc123"]}>
        <Theme>
          <Routes>
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<p>Inloggningssidan</p>} />
          </Routes>
        </Theme>
      </MemoryRouter>
    );
  }

  async function resetWithFakeTimers() {
    vi.useFakeTimers();
    vi.spyOn(api, "confirmPasswordReset").mockResolvedValue({ message: "ok" });
    const view = renderWithLoginRoute();
    fireEvent.change(screen.getByLabelText("Nytt lösenord"), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText("Bekräfta lösenord"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Spara nytt lösenord" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      screen.getByText("Lösenordet har ändrats! Du skickas till inloggningssidan...")
    ).toBeInTheDocument();
    return view;
  }

  it("goes to the login page after 3 seconds", async () => {
    await resetWithFakeTimers();

    act(() => {
      vi.advanceTimersByTime(2_999);
    });
    expect(screen.queryByText("Inloggningssidan")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText("Inloggningssidan")).toBeInTheDocument();
  });

  it("cancels the redirect when the page unmounts", async () => {
    const { unmount } = await resetWithFakeTimers();

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
