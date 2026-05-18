import { useEffect } from "react";

import { useLocation } from "react-router-dom";

import Sidebar from "./components/layout/Sidebar";

import AppRoutes from "./routes/AppRoutes";

import { initDB } from "./lib/database";
import { useThemeStore } from "./store/useThemeStore";
import { performAutomaticBackup } from "./lib/backup";

function App() {
  const location = useLocation();

  const initTheme = useThemeStore((s) => s.initTheme);

  useEffect(() => {
    initDB().then(() => {
      // Automatic backup on startup
      performAutomaticBackup();
      
      // Automatic backup every hour to capture End of Day state
      setInterval(() => {
        performAutomaticBackup();
      }, 60 * 60 * 1000);
    });
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