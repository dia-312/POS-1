import { useEffect, useState, type FormEvent } from "react";

import {
  getUsers,
  addUser,
  updateUser,
  deleteUser,
} from "../lib/database";

import ConfirmModal from "../components/ui/ConfirmModal";
import toast from "react-hot-toast";

type User = {
  id: number;
  username: string;
  role: string;
};

export default function Users() {
  const [users, setUsers] = useState<User[]>(
    []
  );

  const [deleteTarget, setDeleteTarget] =
    useState<User | null>(null);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  function resetForm() {
    setEditingId(null);
    setUsername("");
    setPassword("");
    setPin("");
    setRole("cashier");
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setUsername(user.username);
    setRole(user.role);
    setPassword("");
    setPin("");
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();

    if (!username || (!editingId && !password) || isSaving) return;

    setIsSaving(true);

    try {
      if (editingId) {
        await updateUser(
          editingId,
          username,
          role,
          password || undefined,
          pin || undefined
        );

        toast.success("تم تحديث المستخدم بنجاح");
      } else {
        await addUser(
          username,
          password,
          role,
          pin || "0000"
        );

        toast.success("تمت إضافة المستخدم بنجاح");
      }

      resetForm();
      await loadUsers();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء حفظ المستخدم");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDeleteUser() {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      await deleteUser(deleteTarget.id);

      if (editingId === deleteTarget.id) {
        resetForm();
      }

      await loadUsers();
      toast.success("تم حذف المستخدم بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("فشل حذف المستخدم");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
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

      <form
        onSubmit={handleSubmit}
        className={`bg-white dark:bg-stone-800 p-6 rounded-2xl border mb-6 transition-colors ${
          editingId
            ? "border-amber-500"
            : "border-stone-200 dark:border-stone-700"
        }`}
      >
        {editingId && (
          <div className="flex items-center justify-between mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
            <span className="text-amber-800 dark:text-amber-300 font-medium">
              جاري تعديل: {username || "..."}
            </span>

            <button
              type="button"
              onClick={resetForm}
              className="text-amber-800 dark:text-amber-300 text-sm hover:underline"
            >
              إلغاء التعديل
            </button>
          </div>
        )}

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
            placeholder={
              editingId
                ? "كلمة مرور جديدة (اتركها فارغة للإبقاء عليها)"
                : "كلمة المرور"
            }
            className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-stone-900 dark:text-white"
          />

          <input
            value={pin}
            onChange={(e) =>
              setPin(e.target.value)
            }
            placeholder={
              editingId
                ? "PIN جديد (اتركه فارغاً للإبقاء عليه)"
                : "رمز PIN"
            }
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

        <div className="flex gap-3 mt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-amber-600 hover:bg-amber-700 text-stone-900 dark:text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving
              ? "جاري الحفظ..."
              : editingId
              ? "تحديث المستخدم"
              : "إضافة مستخدم"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-900 dark:text-white px-6 py-3 rounded-lg"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

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
                className={`border-b border-stone-200 dark:border-stone-700 ${
                  editingId === user.id
                    ? "bg-amber-50 dark:bg-amber-950/20"
                    : ""
                }`}
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

                <td className="p-4 flex gap-2">
                  <button
                    onClick={() => startEdit(user)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-stone-900 dark:text-white px-4 py-2 rounded-lg"
                  >
                    تعديل
                  </button>

                  {user.role !== "admin" && (
                  <button
                    onClick={() => setDeleteTarget(user)}
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

      <ConfirmModal
        open={!!deleteTarget}
        loading={isDeleting}
        title="حذف المستخدم"
        message={`هل أنت متأكد من حذف المستخدم "${deleteTarget?.username}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={confirmDeleteUser}
      />
    </div>
  );
}
