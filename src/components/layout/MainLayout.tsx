import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-stone-50 dark:bg-stone-900">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Topbar />

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}