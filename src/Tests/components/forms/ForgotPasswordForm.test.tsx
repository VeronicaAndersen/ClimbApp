import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Theme } from "@radix-ui/themes";
import * as api from "@/services/api";
import { ApiError } from "@/lib/apiError";
import { ForgotPasswordForm } from "../../../components/forms/ForgotPasswordForm";

function renderForgotPasswordForm() {
  return render(
    <MemoryRouter>
      <Theme>
        <ForgotPasswordForm />
      </Theme>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ForgotPasswordForm", () => {
  it("updates the existing polite live region when the request succeeds", async () => {
    let resolveRequest: (response: { message: string }) => void = () => undefined;
    const request = vi.spyOn(api, "requestPasswordReset").mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const user = userEvent.setup();

    renderForgotPasswordForm();

    const status = screen.getByRole("status");
    const alert = screen.getByRole("alert");
    expect(status).toBeEmptyDOMElement();
    expect(alert).toBeEmptyDOMElement();

    await user.type(screen.getByPlaceholderText("Användarnamn"), "alice");
    await user.click(screen.getByRole("button", { name: "Skicka återställningslänk" }));

    expect(request).toHaveBeenCalled();
    resolveRequest({ message: "" });

    await screen.findByText(
      "Om användarnamnet finns i systemet och ett e-postmeddelande är kopplat till kontot kommer du att få en återställningslänk."
    );
    expect(screen.getByRole("status")).toBe(status);
    expect(screen.getByRole("alert")).toBe(alert);
  });

  it("updates the existing assertive live region when the request fails", async () => {
    let rejectRequest: (error: Error) => void = () => undefined;
    const request = vi.spyOn(api, "requestPasswordReset").mockReturnValue(
      new Promise((_, reject) => {
        rejectRequest = reject;
      })
    );
    const user = userEvent.setup();

    renderForgotPasswordForm();

    const alert = screen.getByRole("alert");
    expect(alert).toBeEmptyDOMElement();

    await user.type(screen.getByPlaceholderText("Användarnamn"), "alice");
    await user.click(screen.getByRole("button", { name: "Skicka återställningslänk" }));

    expect(request).toHaveBeenCalled();
    rejectRequest(new Error("network"));

    await screen.findByText("Kunde inte ansluta till servern. Kontrollera din internetanslutning.");
    expect(screen.getByRole("alert")).toBe(alert);
  });
});

describe("ForgotPasswordForm — rate limiting", () => {
  it("shows the wait and disables submit after a 429", async () => {
    vi.spyOn(api, "requestPasswordReset").mockRejectedValue(
      new ApiError({ status: 429, message: "x", retryAfterSeconds: 40 })
    );
    const user = userEvent.setup();
    renderForgotPasswordForm();

    await user.type(screen.getByPlaceholderText("Användarnamn"), "alice");
    await user.click(screen.getByRole("button", { name: "Skicka återställningslänk" }));

    expect(
      await screen.findByText("För många försök. Försök igen om 40 sekunder.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skicka återställningslänk" })).toBeDisabled();
  });

  it("shows the same neutral message whatever the server answers on success", async () => {
    vi.spyOn(api, "requestPasswordReset").mockResolvedValue({
      message: "Om e-postadressen finns i systemet har ett mail skickats.",
    });
    const user = userEvent.setup();
    renderForgotPasswordForm();

    await user.type(screen.getByPlaceholderText("Användarnamn"), "nobody");
    await user.click(screen.getByRole("button", { name: "Skicka återställningslänk" }));

    expect(
      await screen.findByText(
        "Om användarnamnet finns i systemet och ett e-postmeddelande är kopplat till kontot kommer du att få en återställningslänk."
      )
    ).toBeInTheDocument();
  });
});
