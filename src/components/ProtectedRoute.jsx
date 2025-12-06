// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) return null;

  // 1. Si no hay usuario, al login
  if (!user) return <Navigate to="/login" replace />;

  // 2. Si hay roles definidos y el usuario no tiene uno de ellos
  if (allowedRoles && !allowedRoles.includes(role)) {
      // Permitir acceso siempre al ADMIN como "llave maestra"
      if (role !== "ADMIN") {
          return <Navigate to="/unauthorized" replace />;
      }
  }

  // 3. Pase usted
  return <Outlet />;
}