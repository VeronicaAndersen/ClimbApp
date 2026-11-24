import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileBottomNav, ProfileMenubar } from "@/components/ProfileNav";

describe("ProfileMenubar", () => {
  it("hides admin items for climbers", () => {
    render(<ProfileMenubar activeView="profile" isAdmin={false} onNavigate={vi.fn()} />);

    expect(screen.getByText("Anmälan")).toBeInTheDocument();
    expect(screen.queryByText("Klättrare")).not.toBeInTheDocument();
    expect(screen.queryByText("Tombola")).not.toBeInTheDocument();
  });

  it("switches view, or follows the link for route items", async () => {
    const onNavigate = vi.fn().mockReturnValue(true);
    render(<ProfileMenubar activeView="profile" isAdmin onNavigate={onNavigate} />);

    await userEvent.click(screen.getByText("Statistik"));
    expect(onNavigate).toHaveBeenLastCalledWith("statistics");

    await userEvent.click(screen.getByText("Tombola"));
    expect(onNavigate).toHaveBeenLastCalledWith(null, "/tombola");
  });
});

describe("ProfileBottomNav", () => {
  it("shows no overflow button for climbers", () => {
    render(<ProfileBottomNav activeView="profile" isAdmin={false} onNavigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Poäng" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mer" })).not.toBeInTheDocument();
  });

  it("closes the overflow panel after navigating", async () => {
    const onNavigate = vi.fn().mockReturnValue(true);
    render(<ProfileBottomNav activeView="profile" isAdmin onNavigate={onNavigate} />);

    await userEvent.click(screen.getByRole("button", { name: "Mer" }));
    await userEvent.click(screen.getByRole("button", { name: "Resultat" }));

    expect(onNavigate).toHaveBeenCalledWith("leaderboard");
    // The sheet stays mounted while it animates out (jsdom never ends the animation).
    await waitFor(() =>
      expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("data-state", "closed")
    );
  });

  it("keeps the overflow panel open when navigation is cancelled", async () => {
    const onNavigate = vi.fn().mockReturnValue(false);
    render(<ProfileBottomNav activeView="profile" isAdmin onNavigate={onNavigate} />);

    await userEvent.click(screen.getByRole("button", { name: "Mer" }));
    await userEvent.click(screen.getByRole("button", { name: "Tombola" }));

    expect(onNavigate).toHaveBeenCalledWith(null, "/tombola");
    expect(screen.getByRole("button", { name: "Tombola" })).toBeInTheDocument();
  });

  it("switches view from the bottom bar", async () => {
    const onNavigate = vi.fn().mockReturnValue(true);
    render(<ProfileBottomNav activeView="profile" isAdmin={false} onNavigate={onNavigate} />);

    await userEvent.click(
      within(screen.getByRole("navigation")).getByRole("button", { name: "Anmälan" })
    );
    expect(onNavigate).toHaveBeenCalledWith("competition");
  });
});
