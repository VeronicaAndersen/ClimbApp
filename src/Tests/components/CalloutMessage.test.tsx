import { render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { describe, expect, it } from "vitest";
import CalloutMessage from "@/components/feedback/CalloutMessage";

describe("CalloutMessage", () => {
  it("announces error messages assertively", () => {
    render(
      <Theme>
        <CalloutMessage message="Something went wrong" color="red" />
      </Theme>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("announces success messages politely", () => {
    render(
      <Theme>
        <CalloutMessage message="Saved successfully" color="green" />
      </Theme>
    );

    expect(screen.getByRole("status")).toHaveTextContent("Saved successfully");
  });
});
