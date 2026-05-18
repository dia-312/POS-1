import { useThemeStore } from "../store/useThemeStore";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { importDatabase } from "../lib/database";
import { performAutomaticBackup } from "../lib/backup";
import toast from "react-hot-toast";

export default function Settings() {
  const { theme, toggleTheme } = useThemeStore();

  const handleRestore = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'JSON Backup',
          extensions: ['json']
        }]
      });

      if (selected && typeof selected === 'string') {
        const contents = await readTextFile(selected);
        await importDatabase(contents);
        toast.success("Database restored successfully! Reloading...");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to restore database");
    }
  };

  const handleManualBackup = async () => {
    toast.loading("Creating backup...");
    const success = await performAutomaticBackup(true);
    toast.dismiss();
    if (success) {
      toast.success("Backup saved to Documents/POS_Backups");
    } else {
      toast.error("Failed to create backup");
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6">
        <h1 className="text-3xl font-bold text-stone-900 dark:text-white mb-6">
          Settings
        </h1>

        <div className="flex items-center justify-between py-4 border-b border-stone-200 dark:border-stone-700">
          <div>
            <h2 className="text-xl font-semibold text-stone-900 dark:text-white">Appearance</h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Switch between light and dark themes</p>
          </div>
          
          <button
            onClick={toggleTheme}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition shadow-sm"
          >
            Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
        </div>

        {/* DATA MANAGEMENT */}
        <div className="flex items-center justify-between py-4 border-b border-stone-200 dark:border-stone-700">
          <div>
            <h2 className="text-xl font-semibold text-stone-900 dark:text-white">Data Management</h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
              Automatic backups are saved daily to <b>Documents/POS_Backups</b>.<br/>
              You can manually trigger a backup or restore from a previous backup file.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleManualBackup}
              className="px-6 py-3 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-900 dark:text-white rounded-xl font-medium transition shadow-sm"
            >
              Backup Now
            </button>

            <button
              onClick={handleRestore}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition shadow-sm"
            >
              Restore Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}