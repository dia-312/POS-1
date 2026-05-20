import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  loginUser,
  loginWithPin,
} from "../lib/database";

import { useAuthStore } from "../store/useAuthStore";

export default function Login() {
  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [pin, setPin] =
    useState("");

  const login = useAuthStore(
    (s) => s.login
  );

  const navigate = useNavigate();

  /* LOGIN */

  const handleLogin = async () => {
    const user = await loginUser(
      username,
      password
    );

    if (!user) {
      alert("اسم المستخدم أو كلمة المرور غير صحيحة");

      return;
    }

    login(user);

    navigate("/");
  };

  /* PIN LOGIN */

  const handlePinLogin =
    async () => {
      const user =
        await loginWithPin(pin);

      if (!user) {
        alert("رمز PIN غير صحيح");

        return;
      }

      login(user);

      navigate("/");
    };

  return (
    <div className="h-screen flex items-center justify-center bg-stone-100 dark:bg-stone-950">
      <div className="bg-stone-50 dark:bg-stone-900 p-8 rounded-2xl w-96 border border-stone-200 dark:border-stone-800">
        <h1 className="text-stone-900 dark:text-white text-3xl mb-6 font-bold">
          تسجيل الدخول
        </h1>

        {/* USERNAME */}

        <input
          placeholder="اسم المستخدم"
          value={username}
          className="w-full mb-3 p-3 rounded bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
          onChange={(e) =>
            setUsername(
              e.target.value
            )
          }
        />

        {/* PASSWORD */}

        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          className="w-full mb-5 p-3 rounded bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
        />

        {/* LOGIN */}

        <button
          onClick={handleLogin}
          className="w-full bg-amber-600 hover:bg-amber-700 text-stone-900 dark:text-white p-3 rounded"
        >
          تسجيل الدخول
        </button>

        {/* PIN LOGIN */}

        <div className="mt-6 border-t border-stone-200 dark:border-stone-700 pt-6">
          <h2 className="text-stone-900 dark:text-white mb-3">
            تسجيل دخول سريع برمز PIN
          </h2>

          <input
            placeholder="رمز PIN"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value)
            }
            className="w-full mb-3 p-3 rounded bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
          />

          <button
            onClick={
              handlePinLogin
            }
            className="w-full bg-green-600 hover:bg-green-700 text-stone-900 dark:text-white p-3 rounded"
          >
            دخول بواسطة PIN
          </button>
        </div>
      </div>
    </div>
  );
}