import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ allowedRoles, requiredPermission }) {
  const { user, role, loading, can } = useAuth();

  if (loading) return null;

  // 1. Si no hay usuario
  if (!user) return <Navigate to="/login" replace />;

  // 2. CHECK POR ROL (Legacy / Global)
  if (allowedRoles && !allowedRoles.includes(role)) {
      if (role !== "ADMIN") { // Admin siempre pasa
          return <Navigate to="/unauthorized" replace />;
      }
  }

  // 3. CHECK POR PERMISO GRANULAR (Nuevo sistema)
  if (requiredPermission) {
      if (!can(requiredPermission)) {
           return <Navigate to="/unauthorized" replace />;
      }
  }

  return <Outlet />;
}