import { create } from "zustand";

import { persist } from "zustand/middleware";

type User = {
  id: number;
  username: string;
  role: "admin" | "cashier";
};

type AuthStore = {
  user: User | null;

  login: (user: User) => void;

  logout: () => void;
};

export const useAuthStore =
  create<AuthStore>()(
    persist(
      (set) => ({
        user: null,

        login: (user) => set({ user }),

        logout: () => set({ user: null }),
      }),
      {
        name: "auth-storage",
      }
    )
  );