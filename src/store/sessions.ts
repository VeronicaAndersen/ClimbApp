import { create } from "zustand";
import { persist } from "zustand/middleware";

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

      removeSession: (id) =>
        set((state) => {
          const remaining = state.sessions.filter((s) => s.id !== id);
          const newActiveId = state.activeId === id ? (remaining[0]?.id ?? null) : state.activeId;
          return { sessions: remaining, activeId: newActiveId };
        }),

      setActiveId: (id) => set({ activeId: id }),

      clearSessions: () => set({ sessions: [], activeId: null }),
    }),
    { name: "climber-sessions" }
  )
);
