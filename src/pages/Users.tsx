import { useEffect, useState } from "react";

import {
  getUsers,
  addUser,
  deleteUser,
} from "../lib/database";

type User = {
  id: number;
  username: string;
  role: string;
};

export default function Users() {
  const [users, setUsers] = useState<User[]>(
    []
  );

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [pin, setPin] =
    useState("");

  const [role, setRole] =
    useState("cashier");

  async function loadUsers() {
    const data = await getUsers();

    setUsers(data);
  }

  async function handleAddUser() {
    if (!username || !password) return;

    await addUser(
      username,
      password,
      role,
      pin || "0000"
    );

    setUsername("");
    setPassword("");
    setPin("");

    loadUsers();
  }

  async function handleDelete(id: number) {
    await deleteUser(id);

    loadUsers();
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-900 dark:text-white mb-6">
        المستخدمين
      </h1>

      {/* FORM */}

      <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <input
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            placeholder="اسم المستخدم"
            className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-stone-900 dark:text-white"
          />

          <input
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="كلمة المرور"
            className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-stone-900 dark:text-white"
          />

          <input
            value={pin}
            onChange={(e) =>
              setPin(e.target.value)
            }
            placeholder="رمز PIN"
            className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-stone-900 dark:text-white"
          />

          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value)
            }
            className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-stone-900 dark:text-white"
          >
            <option value="cashier">
              كاشير
            </option>

            <option value="admin">
              مسؤول
            </option>
          </select>
        </div>

        <button
          onClick={handleAddUser}
          className="mt-4 bg-amber-600 hover:bg-amber-700 text-stone-900 dark:text-white px-6 py-3 rounded-lg"
        >
          إضافة مستخدم
        </button>
      </div>

      {/* TABLE */}

      <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 dark:bg-stone-900">
            <tr>
              <th className="text-start p-4 text-stone-600 dark:text-stone-300">
                المعرف
              </th>

              <th className="text-start p-4 text-stone-600 dark:text-stone-300">
                اسم المستخدم
              </th>

              <th className="text-start p-4 text-stone-600 dark:text-stone-300">
                الصلاحية
              </th>

              <th className="text-start p-4 text-stone-600 dark:text-stone-300">
                العمليات
              </th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-stone-200 dark:border-stone-700"
              >
                <td className="p-4 text-stone-900 dark:text-white">
                  {user.id}
                </td>

                <td className="p-4 text-stone-900 dark:text-white">
                  {user.username}
                </td>

                <td className="p-4 text-stone-900 dark:text-white">
                  {user.role === "admin" ? "مسؤول" : "كاشير"}
                </td>

                <td className="p-4">
                  {user.role !== "admin" && (
                  <button
                    onClick={() =>
                      handleDelete(user.id)
                    }
                    className="bg-red-600 hover:bg-red-700 text-stone-900 dark:text-white px-4 py-2 rounded-lg"
                  >
                    حذف
                  </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}