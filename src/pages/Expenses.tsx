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
      <h1 className="text-3xl font-bold text-white mb-6">
        Expenses
      </h1>

      {/* FORM */}

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="Expense Title"
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white"
          />

          <input
            type="number"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            placeholder="Amount"
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white"
          />
        </div>

        <button
          onClick={handleAddExpense}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg"
        >
          Add Expense
        </button>
      </div>

      {/* TABLE */}

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="text-left p-4 text-slate-300">
                Title
              </th>

              <th className="text-left p-4 text-slate-300">
                Amount
              </th>

              <th className="text-left p-4 text-slate-300">
                Date
              </th>
            </tr>
          </thead>

          <tbody>
            {expenses.map((expense) => (
              <tr
                key={expense.id}
                className="border-b border-slate-700"
              >
                <td className="p-4 text-white">
                  {expense.title}
                </td>

                <td className="p-4 text-red-400">
                  ${expense.amount}
                </td>

                <td className="p-4 text-slate-400">
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