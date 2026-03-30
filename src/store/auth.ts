import { create } from "zustand";

interface AuthState {
  id: number | null;
  name: string | null;
  created_at: string | null;
  token: string | null;
  climber: string | null;
  setToken: (token: string | null) => void;
  setClimber: (climber: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  id: null,
  name: null,
  created_at: null,
  token: null,
  climber: null,
  setToken: (token) => set({ token }),
  setClimber: (climber) => set({ climber }),
}));
