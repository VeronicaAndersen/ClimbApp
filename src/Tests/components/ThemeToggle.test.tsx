import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_STORAGE_KEY, useThemeStore } from "@/store/theme";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    useThemeStore.setState({ theme: "light" });
  });

  it("switches to dark mode, sets the html class and remembers the choice", async () => {
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole("button", { name: "Byt till mörkt tema" }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: "Byt till ljust tema" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("switches back to light mode", async () => {
    useThemeStore.setState({ theme: "dark" });
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole("button", { name: "Byt till ljust tema" }));

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
