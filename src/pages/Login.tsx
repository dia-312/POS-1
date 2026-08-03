import { useState, type FormEvent } from "react";
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

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isPinLoggingIn, setIsPinLoggingIn] = useState(false);

  const login = useAuthStore(
    (s) => s.login
  );

  const navigate = useNavigate();

  /* LOGIN */

  const handleLogin = async (e?: FormEvent) => {
    e?.preventDefault();

    if (isLoggingIn) return;
    setIsLoggingIn(true);

    try {
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
    } finally {
      setIsLoggingIn(false);
    }
  };

  /* PIN LOGIN */

  const handlePinLogin = async (e?: FormEvent) => {
    e?.preventDefault();

    if (isPinLoggingIn) return;
    setIsPinLoggingIn(true);

    try {
      const user = await loginWithPin(pin);

      if (!user) {
        alert("رمز PIN غير صحيح");
        return;
      }

      login(user);
      navigate("/");
    } finally {
      setIsPinLoggingIn(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-stone-100 dark:bg-stone-950">
      <div className="bg-stone-50 dark:bg-stone-900 p-8 rounded-2xl w-96 border border-stone-200 dark:border-stone-800">
        <h1 className="text-stone-900 dark:text-white text-3xl mb-6 font-bold">
          تسجيل الدخول
        </h1>

        <form onSubmit={handleLogin}>
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
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-amber-600 hover:bg-amber-700 text-stone-900 dark:text-white p-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? "جارٍ الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        {/* PIN LOGIN */}

        <div className="mt-6 border-t border-stone-200 dark:border-stone-700 pt-6">
          <h2 className="text-stone-900 dark:text-white mb-3">
            تسجيل دخول سريع برمز PIN
          </h2>

          <form onSubmit={handlePinLogin}>
            <input
              placeholder="رمز PIN"
              value={pin}
              onChange={(e) =>
                setPin(e.target.value)
              }
              className="w-full mb-3 p-3 rounded bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
            />

            <button
              type="submit"
              disabled={isPinLoggingIn}
              className="w-full bg-green-600 hover:bg-green-700 text-stone-900 dark:text-white p-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPinLoggingIn ? "جارٍ الدخول..." : "دخول بواسطة PIN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
