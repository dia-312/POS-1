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
      <div className="bg-slate-900 w-[400px] rounded-2xl p-6 border border-slate-700">
        <h2 className="text-white text-2xl font-bold mb-4">
          Confirm Checkout
        </h2>

        <p className="text-slate-300 mb-6">
          Total Amount:
        </p>

        <div className="text-4xl font-bold text-white mb-8">
          ${total.toFixed(2)}
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}