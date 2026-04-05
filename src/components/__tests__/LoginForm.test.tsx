/**
 * Integration test for LoginForm.
 *
 * Tests the form's rendering, validation, API call integration, and error
 * display by combining the form state, the service call, and the UI feedback
 * sub-component (CalloutMessage).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Theme } from "@radix-ui/themes";
import { LoginForm } from "../forms/LoginForm";
import * as api from "@/services/api";

// Wrap with the providers LoginForm needs
function renderLoginForm() {
  return render(
    <MemoryRouter>
      <Theme>
        <LoginForm />
      </Theme>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("LoginForm — rendering", () => {
  it("renders the heading", () => {
    renderLoginForm();
    expect(screen.getByRole("heading", { name: "Logga in" })).toBeInTheDocument();
  });

  it("renders username and password fields", () => {
    renderLoginForm();
    expect(screen.getByPlaceholderText("Användarnamn")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Lösenord")).toBeInTheDocument();
  });

  it("renders the forgot-password link", () => {
    renderLoginForm();
    expect(screen.getByText("Glömt lösenord?")).toBeInTheDocument();
  });

  it("renders the register link", () => {
    renderLoginForm();
    expect(screen.getByText("Registrera dig")).toBeInTheDocument();
  });

  it("submit button is disabled when fields are empty", () => {
    renderLoginForm();
    // The submit button text when not loading
    const btn = screen.getByRole("button", { name: "Logga in" });
    expect(btn).toBeDisabled();
  });
});

describe("LoginForm — interaction", () => {
  it("enables submit button after filling both fields", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByPlaceholderText("Användarnamn"), "alice");
    await user.type(screen.getByPlaceholderText("Lösenord"), "secret123");

    const btn = screen.getByRole("button", { name: "Logga in" });
    expect(btn).not.toBeDisabled();
  });

  it("keeps submit disabled if only username is filled", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByPlaceholderText("Användarnamn"), "alice");

    expect(screen.getByRole("button", { name: "Logga in" })).toBeDisabled();
  });

  it("keeps submit disabled if only password is filled", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByPlaceholderText("Lösenord"), "secret123");

    expect(screen.getByRole("button", { name: "Logga in" })).toBeDisabled();
  });
});

describe("LoginForm — API integration", () => {
  it("calls loginClimber with trimmed lowercase username on submit", async () => {
    const spy = vi.spyOn(api, "loginClimber").mockResolvedValue(null);
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByPlaceholderText("Användarnamn"), "  Alice  ");
    await user.type(screen.getByPlaceholderText("Lösenord"), "secret123");
    await user.click(screen.getByRole("button", { name: "Logga in" }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        username: "alice",
        password: "secret123",
      });
    });
  });

  it("shows error message when loginClimber throws", async () => {
    vi.spyOn(api, "loginClimber").mockRejectedValue(new Error("401 Unauthorized"));
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByPlaceholderText("Användarnamn"), "alice");
    await user.type(screen.getByPlaceholderText("Lösenord"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Logga in" }));

    await waitFor(() => {
      // CalloutMessage should appear with an error
      expect(screen.getByRole("paragraph")).toBeInTheDocument();
    });
  });

  it("clears error message on a subsequent successful attempt", async () => {
    const spy = vi
      .spyOn(api, "loginClimber")
      .mockRejectedValueOnce(new Error("401 Unauthorized"))
      .mockResolvedValueOnce(null);

    const user = userEvent.setup();
    renderLoginForm();

    const usernameInput = screen.getByPlaceholderText("Användarnamn");
    const passwordInput = screen.getByPlaceholderText("Lösenord");
    const btn = () => screen.getByRole("button", { name: "Logga in" });

    // First attempt — error
    await user.type(usernameInput, "alice");
    await user.type(passwordInput, "wrong");
    await user.click(btn());
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    // Second attempt — success (error should clear)
    await user.clear(passwordInput);
    await user.type(passwordInput, "correct123");
    await user.click(btn());
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    // The error callout should be gone
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });
});
