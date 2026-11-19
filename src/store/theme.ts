import { create } from "zustand";

export type ThemeMode = "light" | "dark";

// Same key is read by the inline script in index.html to avoid a flash on load.
export const THEME_STORAGE_KEY = "theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStoredTheme(): ThemeMode | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): ThemeMode {
  return typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches
    ? "dark"
    : "light";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

interface ThemeState {
  theme: ThemeMode;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: readStoredTheme() ?? systemTheme(),
  toggleTheme: () => {
    const next: ThemeMode = get().theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice still applies for this visit.
    }
    applyTheme(next);
    set({ theme: next });
  },
}));

// Follow the OS setting until the user picks a theme explicitly.
if (typeof window !== "undefined") {
  applyTheme(useThemeStore.getState().theme);
  window.matchMedia?.(DARK_QUERY).addEventListener?.("change", (event) => {
    if (readStoredTheme()) return;
    const theme: ThemeMode = event.matches ? "dark" : "light";
    applyTheme(theme);
    useThemeStore.setState({ theme });
  });
}
