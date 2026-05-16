import { Navigate } from "react-router-dom";

import { useAuthStore } from "../store/useAuthStore";

export default function AdminRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore(
    (s) => s.user
  );

  /* NOT LOGGED IN */

  if (!user) {
    return (
      <Navigate to="/login" />
    );
  }

  /* NOT ADMIN */

  if (user.role !== "admin") {
    return (
      <Navigate to="/cashier" />
    );
  }

  /* ADMIN */

  return children;
}