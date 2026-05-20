import { useEffect, useState } from "react";

import {
  addExpense,
  getExpenses,
} from "../lib/database";

export default function Expenses() {
  const [expenses, setExpenses] =
    useState<any[]>([]);

  const [title, setTitle] =
    useState("");

  const [amount, setAmount] =
    useState("");

  async function loadExpenses() {
    const data = await getExpenses();

    setExpenses(data);
  }

  async function handleAddExpense() {
    if (!title || !amount) return;

    await addExpense(
      title,
      Number(amount)
    );

    setTitle("");
    setAmount("");

    loadExpenses();
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

      <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-6 mb-6">
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
          onClick={handleAddExpense}
          className="mt-4 bg-red-600 hover:bg-red-700 text-stone-900 dark:text-white px-6 py-3 rounded-lg"
        >
          إضافة مصروف
        </button>
      </div>

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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}