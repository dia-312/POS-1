import { create } from "zustand";

type ThemeStore = {
  theme: "light" | "dark";
  toggleTheme: () => void;
  initTheme: () => void;
};

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: (localStorage.getItem("pos-theme") as "light" | "dark") || "dark",
  
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === "light" ? "dark" : "light";
      localStorage.setItem("pos-theme", newTheme);
      
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      
      return { theme: newTheme };
    }),
    
  initTheme: () => {
    const theme = (localStorage.getItem("pos-theme") as "light" | "dark") || "dark";
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    set({ theme });
  }
}));
