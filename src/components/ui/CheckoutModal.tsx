type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  total: number;
};

export default function CheckoutModal({
  open,
  onClose,
  onConfirm,
  total,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-stone-50 dark:bg-stone-900 w-[400px] rounded-2xl p-6 border border-stone-200 dark:border-stone-700">
        <h2 className="text-2xl font-bold mb-4">
          Confirm Checkout
        </h2>

        <div className="text-4xl font-bold mb-8">
          ₪{total.toFixed(2)}
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 py-3 rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}