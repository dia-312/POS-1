import { useThemeStore } from "../store/useThemeStore";
import { useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { importDatabase } from "../lib/database";
import { performAutomaticBackup } from "../lib/backup";
import toast from "react-hot-toast";

export default function Settings() {
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleRestore = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'JSON Backup', extensions: ['json'] }]
      });

      if (selected && typeof selected === 'string') {
        const contents = await readTextFile(selected);
        await importDatabase(contents);
        toast.success("تمت استعادة قاعدة البيانات بنجاح! جاري إعادة التحميل...");
        setTimeout(() => { window.location.reload(); }, 1500);
      }
    } catch (err) {
      console.error(err);
      toast.error("فشلت استعادة قاعدة البيانات");
    }
  };

  const handleManualBackup = async () => {
    toast.loading("جاري إنشاء نسخة احتياطية...");
    const success = await performAutomaticBackup(true);
    toast.dismiss();
    if (success) {
      toast.success("تم حفظ النسخة الاحتياطية في Documents/POS_Backups");
    } else {
      toast.error("فشل إنشاء النسخة الاحتياطية");
    }
  };

  const goToAbout = () => navigate('/about');

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6">
        <h1 className="text-3xl font-bold text-stone-900 dark:text-white mb-6">الإعدادات</h1>

        <div className="flex items-center justify-between py-4 border-b border-stone-200 dark:border-stone-700">
          <div>
            <h2 className="text-xl font-semibold text-stone-900 dark:text-white">المظهر</h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">التبديل بين المظهر الفاتح والداكن</p>
          </div>
          <button onClick={toggleTheme} className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition shadow-sm">
            التبديل إلى الوضع {theme === 'light' ? 'الداكن' : 'الفاتح'}
          </button>
        </div>

        {/* DATA MANAGEMENT */}
        <div className="flex items-center justify-between py-4 border-b border-stone-200 dark:border-stone-700">
          <div>
            <h2 className="text-xl font-semibold text-stone-900 dark:text-white">إدارة البيانات</h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
              يتم حفظ النسخ الاحتياطية تلقائيًا يوميًا في المجلد <b>Documents/POS_Backups</b>.<br/>
              يمكنك عمل نسخة احتياطي يدوية الآن أو استعادة البيانات من ملف نسخة احتياطية سابق.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleManualBackup} className="px-6 py-3 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-900 dark:text-white rounded-xl font-medium transition shadow-sm">
              نسخ احتياطي الآن
            </button>
            <button onClick={handleRestore} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition shadow-sm">
              استعادة البيانات
            </button>
          </div>
        </div>

        {/* ABOUT SECTION */}
        <div className="flex items-center justify-between py-4">
          <div>
            <h2 className="text-xl font-semibold text-stone-900 dark:text-white">حول التطبيق</h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">معلومات عن المطور وإصدار البرنامج.</p>
          </div>
          <button onClick={goToAbout} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition shadow-sm">
            About / Developer Info
          </button>
        </div>
      </div>
    </div>
  );
}