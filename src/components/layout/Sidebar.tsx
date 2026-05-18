import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import { useAuthStore } from "../../store/useAuthStore";

export default function Sidebar() {
  const logout = useAuthStore(
    (s) => s.logout
  );

  const user = useAuthStore(
    (s) => s.user
  );

  const navigate = useNavigate();

  const links = [
    /* ADMIN ONLY */

    ...(user?.role === "admin"
      ? [
          {
            name: "Dashboard",
            path: "/",
          },

          {
            name: "Users",
            path: "/users",
          },
          {
            name: "Reports",
            path: "/reports",
          },
        ]
      : []),

    /* ALL USERS */

    {
      name: "Cashier",
      path: "/cashier",
    },

    {
      name: "Products",
      path: "/products",
    },

    {
      name: "Orders",
      path: "/orders",
    },

    {
      name: "Expenses",
      path: "/expenses",
    },

    {
      name: "Settings",
      path: "/settings",
    },
  ];

  return (
    <div className="w-64 bg-stone-100 dark:bg-stone-950 border-r border-stone-200 dark:border-stone-800 p-4 flex flex-col">
      <div>
        <h1 className="text-stone-900 dark:text-white text-2xl font-bold mb-10">
          POS SYSTEM
        </h1>

        <div className="flex flex-col gap-2">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({
                isActive,
              }) =>
                `px-4 py-3 rounded-xl transition ${
                  isActive
                    ? "bg-amber-600 text-stone-900 dark:text-white"
                    : "text-stone-600 dark:text-stone-300 hover:bg-white dark:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-900 dark:text-white"
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </div>
      </div>

      <button
        onClick={() => {
          logout();

          navigate("/login");
        }}
        className="mt-auto text-red-400 hover:text-red-300 px-4 py-3 text-left"
      >
        Logout
      </button>
    </div>
  );
}