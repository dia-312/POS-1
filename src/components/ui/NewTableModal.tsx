import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  /* resolves when the table was opened; rejects with a message to show */
  onCreate: (label: string) => Promise<void>;
};

export default function NewTableModal({ open, onClose, onCreate }: Props) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const close = () => {
    setLabel("");
    setError("");
    onClose();
  };

  const submit = async () => {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await onCreate(label);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر فتح الطاولة");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-stone-50 dark:bg-stone-900 w-[400px] rounded-2xl p-6 border border-stone-200 dark:border-stone-700">
        <h2 className="text-xl font-bold mb-4 text-stone-900 dark:text-stone-50">
          فتح طلب لطاولة
        </h2>

        <input
          autoFocus
          type="text"
          placeholder="رقم أو اسم الطاولة (مثال: 3)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") close();
          }}
          maxLength={30}
          className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-stone-900 dark:text-stone-50 focus:outline-none focus:border-amber-500"
        />

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <div className="flex gap-4 mt-6">
          <button
            onClick={close}
            className="flex-1 bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 py-3 rounded-lg"
          >
            إلغاء
          </button>

          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white py-3 rounded-lg"
          >
            فتح
          </button>
        </div>
      </div>
    </div>
  );
}
