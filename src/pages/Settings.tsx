import { useThemeStore } from "../store/useThemeStore";

export default function Settings() {
  const { theme, toggleTheme } = useThemeStore();

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
      </div>
    </div>
  );
}