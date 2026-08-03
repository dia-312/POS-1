type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-stone-50 dark:bg-stone-900 w-[400px] rounded-2xl p-6 border border-stone-200 dark:border-stone-700">
        <h2 className="text-xl font-bold mb-2 text-stone-900 dark:text-stone-50">
          {title}
        </h2>

        <p className="text-stone-600 dark:text-stone-400 mb-6">{message}</p>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 text-white py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading ? "جارٍ التنفيذ..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
