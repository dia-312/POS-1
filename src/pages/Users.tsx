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
      role
    );

    setUsername("");
    setPassword("");

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
      <h1 className="text-3xl font-bold text-white mb-6">
        Users
      </h1>

      {/* FORM */}

      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <input
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            placeholder="Username"
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white"
          />

          <input
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Password"
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white"
          />

          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value)
            }
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white"
          >
            <option value="cashier">
              Cashier
            </option>

            <option value="admin">
              Admin
            </option>
          </select>
        </div>

        <button
          onClick={handleAddUser}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
        >
          Add User
        </button>
      </div>

      {/* TABLE */}

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="text-left p-4 text-slate-300">
                ID
              </th>

              <th className="text-left p-4 text-slate-300">
                Username
              </th>

              <th className="text-left p-4 text-slate-300">
                Role
              </th>

              <th className="text-left p-4 text-slate-300">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-slate-700"
              >
                <td className="p-4 text-white">
                  {user.id}
                </td>

                <td className="p-4 text-white">
                  {user.username}
                </td>

                <td className="p-4 text-white">
                  {user.role}
                </td>

                <td className="p-4">
                  {user.role !== "admin" && (
                  <button
                    onClick={() =>
                      handleDelete(user.id)
                    }
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    Delete
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