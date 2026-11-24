import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { onTokensRefreshed } from "@/lib/apiClient";

export type ClimberSession = {
  id: number;
  name: string;
  accessToken: string;
  refreshToken: string;
};

interface SessionsState {
  sessions: ClimberSession[];
  activeId: number | null;
  addOrUpdateSession: (session: ClimberSession) => void;
  /** Replace the tokens of the session holding `oldRefreshToken`, if any. */
  updateTokens: (oldRefreshToken: string, accessToken: string, refreshToken: string) => void;
  removeSession: (id: number) => void;
  setActiveId: (id: number) => void;
  clearSessions: () => void;
}

export const useSessionsStore = create<SessionsState>()(
  persist(
    (set) => ({
      sessions: [],
      activeId: null,

      addOrUpdateSession: (session) =>
        set((state) => {
          const exists = state.sessions.some((s) => s.id === session.id);
          return {
            sessions: exists
              ? state.sessions.map((s) => (s.id === session.id ? session : s))
              : [...state.sessions, session],
          };
        }),

      updateTokens: (oldRefreshToken, accessToken, refreshToken) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.refreshToken === oldRefreshToken ? { ...s, accessToken, refreshToken } : s
          ),
        })),

      removeSession: (id) =>
        set((state) => {
          const remaining = state.sessions.filter((s) => s.id !== id);
          const newActiveId = state.activeId === id ? (remaining[0]?.id ?? null) : state.activeId;
          return { sessions: remaining, activeId: newActiveId };
        }),

      setActiveId: (id) => set({ activeId: id }),

      clearSessions: () => set({ sessions: [], activeId: null }),
    }),
    // Same lifetime as the refresh token in apiClient: sessionStorage, so
    // saved tokens are gone when the tab closes and never reach localStorage.
    { name: "climber-sessions", storage: createJSONStorage(() => sessionStorage) }
  )
);

// Earlier versions kept the sessions, tokens included, in localStorage.
localStorage.removeItem("climber-sessions");

// A refresh rotates the active account's tokens; keep its saved copy current
// so switching back to it later does not use an expired refresh token.
onTokensRefreshed((oldRefreshToken, tokens) =>
  useSessionsStore
    .getState()
    .updateTokens(oldRefreshToken, tokens.access_token, tokens.refresh_token)
);
