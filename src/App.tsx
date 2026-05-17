import { useEffect } from "react";

import { useLocation } from "react-router-dom";

import Sidebar from "./components/layout/Sidebar";

import AppRoutes from "./routes/AppRoutes";

import { initDB } from "./lib/database";
import { useThemeStore } from "./store/useThemeStore";

function App() {
  const location = useLocation();

  const initTheme = useThemeStore((s) => s.initTheme);

  useEffect(() => {
    initDB();
    initTheme();
  }, [initTheme]);

  const isLoginPage =
    location.pathname === "/login";

  if (isLoginPage) {
    return <AppRoutes />;
  }

  return (
    <div className="flex h-screen bg-stone-100 dark:bg-stone-950">
      <Sidebar />

      <main className="flex-1 p-6 overflow-auto">
        <AppRoutes />
      </main>
    </div>
  );
}

export default App;