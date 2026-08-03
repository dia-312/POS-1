import { useEffect, useState, type FormEvent } from "react";

import {
  addExpense,
  deleteExpense,
  getExpenses,
} from "../lib/database";

import ConfirmModal from "../components/ui/ConfirmModal";
import toast from "react-hot-toast";

type Expense = {
  id: number;
  title: string;
  amount: number;
  created_at: string;
};

export default function Expenses() {
  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [title, setTitle] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<Expense | null>(null);

  async function loadExpenses() {
    const data = await getExpenses();

    setExpenses(data);
  }

  async function handleAddExpense(e?: FormEvent) {
    e?.preventDefault();

    if (!title || !amount || isSaving) return;

    setIsSaving(true);

    try {
      await addExpense(
        title,
        Number(amount)
      );

      toast.success("تمت إضافة المصروف بنجاح");

      setTitle("");
      setAmount("");

      await loadExpenses();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء إضافة المصروف");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDeleteExpense() {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      await deleteExpense(deleteTarget.id);
      await loadExpenses();
      toast.success("تم حذف المصروف بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("فشل حذف المصروف");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-900 dark:text-white mb-6">
        المصاريف
      </h1>

      {/* FORM */}

      <form
        onSubmit={handleAddExpense}
        className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-6 mb-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="اسم المصروف"
            className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-stone-900 dark:text-white"
          />

          <input
            type="number"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            placeholder="القيمة"
            className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-stone-900 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="mt-4 bg-red-600 hover:bg-red-700 text-stone-900 dark:text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "جاري الإضافة..." : "إضافة مصروف"}
        </button>
      </form>

      {/* TABLE */}

      <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 dark:bg-stone-900">
            <tr>
              <th className="text-start p-4 text-stone-600 dark:text-stone-300">
                اسم المصروف
              </th>

              <th className="text-start p-4 text-stone-600 dark:text-stone-300">
                القيمة
              </th>

              <th className="text-start p-4 text-stone-600 dark:text-stone-300">
                التاريخ
              </th>

              <th className="text-start p-4 text-stone-600 dark:text-stone-300">
                العمليات
              </th>
            </tr>
          </thead>

          <tbody>
            {expenses.map((expense) => (
              <tr
                key={expense.id}
                className="border-b border-stone-200 dark:border-stone-700"
              >
                <td className="p-4 text-stone-900 dark:text-white">
                  {expense.title}
                </td>

                <td className="p-4 text-red-400">
                   ₪{expense.amount}
                </td>

                <td className="p-4 text-stone-500 dark:text-stone-400">
                  {new Date(
                    expense.created_at
                  ).toLocaleDateString()}
                </td>

                <td className="p-4">
                  <button
                    onClick={() => setDeleteTarget(expense)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}

            {expenses.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center text-stone-500 dark:text-stone-400"
                >
                  لا توجد مصاريف مسجّلة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        loading={isDeleting}
        title="حذف المصروف"
        message={`هل أنت متأكد من حذف "${deleteTarget?.title}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={confirmDeleteExpense}
      />
    </div>
  );
}
