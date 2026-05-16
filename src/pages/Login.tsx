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
      alert("Invalid credentials");

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
        alert("Invalid PIN");

        return;
      }

      login(user);

      navigate("/");
    };

  return (
    <div className="h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 p-8 rounded-2xl w-96 border border-slate-800">
        <h1 className="text-white text-3xl mb-6 font-bold">
          POS Login
        </h1>

        {/* USERNAME */}

        <input
          placeholder="Username"
          value={username}
          className="w-full mb-3 p-3 rounded bg-slate-800 text-white"
          onChange={(e) =>
            setUsername(
              e.target.value
            )
          }
        />

        {/* PASSWORD */}

        <input
          type="password"
          placeholder="Password"
          value={password}
          className="w-full mb-5 p-3 rounded bg-slate-800 text-white"
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
        />

        {/* LOGIN */}

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded"
        >
          Login
        </button>

        {/* PIN LOGIN */}

        <div className="mt-6 border-t border-slate-700 pt-6">
          <h2 className="text-white mb-3">
            Quick PIN Login
          </h2>

          <input
            placeholder="PIN"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value)
            }
            className="w-full mb-3 p-3 rounded bg-slate-800 text-white"
          />

          <button
            onClick={
              handlePinLogin
            }
            className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded"
          >
            Login With PIN
          </button>
        </div>
      </div>
    </div>
  );
}