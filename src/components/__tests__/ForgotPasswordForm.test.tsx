import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Theme } from "@radix-ui/themes";
import * as api from "@/services/api";
import { ForgotPasswordForm } from "../forms/ForgotPasswordForm";

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
    expect(status).toBeEmptyDOMElement();

    await user.type(screen.getByPlaceholderText("Användarnamn"), "alice");
    await user.click(screen.getByRole("button", { name: "Skicka återställningslänk" }));

    expect(request).toHaveBeenCalled();
    resolveRequest({ message: "" });

    await screen.findByText(
      "Om användarnamnet finns i systemet och ett e-postmeddelande är kopplat till kontot kommer du att få en återställningslänk."
    );
    expect(screen.getByRole("status")).toBe(status);
  });
});
