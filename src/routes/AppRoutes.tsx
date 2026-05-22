import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Dashboard from "../pages/Dashboard";
import Cashier from "../pages/Cashier";
import Products from "../pages/Products";
import Orders from "../pages/Orders";
import Login from "../pages/Login";
import Expenses from "../pages/Expenses";
import Settings from "../pages/Settings";
import Users from "../pages/Users";
import Reports from "../pages/Reports";
import About from "../pages/About";

import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";

export default function AppRoutes() {
  return (
    <Routes>

      {/* LOGIN */}

      <Route
        path="/login"
        element={<Login />}
      />

      {/* ADMIN ONLY */}

      <Route
        path="/"
        element={
          <AdminRoute>
            <Dashboard />
          </AdminRoute>
        }
      />

      <Route
        path="/users"
        element={
          <AdminRoute>
            <Users />
          </AdminRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <AdminRoute>
            <Reports />
          </AdminRoute>
        }
      />

      {/* ALL USERS */}

      <Route
        path="/cashier"
        element={
          <ProtectedRoute>
            <Cashier />
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        }
      />

      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        }
      />

      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Expenses />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* ABOUT PAGE (public) */}
      <Route
        path="/about"
        element={<About />}
      />

      {/* FALLBACK */}

      <Route
        path="*"
        element={
          <Navigate to="/login" />
        }
      />
    </Routes>
  );
}