// src/router.jsx
import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext"; // 👈 Importamos el hook real

import AppLayout from "@/layouts/AppLayout.jsx";

import DashboardPage from "@/pages/DashboardPage.jsx";
import PatientsPage from "@/pages/PatientsPage.jsx";
import PatientDetailPage from "@/pages/PatientDetailPage.jsx";
import ConsultationDetailPage from "@/pages/ConsultationDetailPage.jsx";
import WorkOrdersPage from "@/pages/WorkOrdersPage.jsx";
import InventoryPage from "@/pages/InventoryPage.jsx";
import LoginPage from "@/pages/LoginPage.jsx";
import NotFound from "@/pages/NotFound.jsx";
import UnauthorizedPage from "@/pages/UnauthorizedPage.jsx";
import SalesPage from "@/pages/SalesPage.jsx";
import FinancePage from "@/pages/FinancePage.jsx";
import ExpensesPage from "@/pages/ExpensesPage.jsx";
import LabsPage from "@/pages/LabsPage.jsx";
import StatisticsPage from "@/pages/StatisticsPage.jsx";
import ReceivablesPage from "@/pages/ReceivablesPage.jsx";
import TeamPage from "@/pages/TeamPage.jsx";
import PayablesPage from "@/pages/PayablesPage.jsx";
import PayrollPage from "@/pages/PayrollPage.jsx";
import SalesHistoryPage from "@/pages/SalesHistoryPage.jsx";
import SuppliersPage from "@/pages/SuppliersPage.jsx";
import ShiftPage from "@/pages/ShiftPage.jsx";

// 👇 Componente actualizado para manejar la carga asíncrona de Firebase
function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  // 1. Si Firebase aún está verificando, mostramos carga (evita "parpadeo" al login)
  if (loading) {
    return (
      <div style={{ height: "100vh", display: "grid", placeItems: "center", color: "#666" }}>
        Cargando sesión...
      </div>
    );
  }

  // 2. Si terminó de cargar y no hay usuario, mandamos al login
  if (!user) return <Navigate to="/login" replace />;

  // 3. Si hay usuario, mostramos la app
  return children;
}

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      // Redirección inicial
      { index: true, element: <Navigate to="/dashboard" replace /> },
      
      // Módulos Principales
      { path: "dashboard", element: <DashboardPage /> },
      { path: "sales", element: <SalesPage /> },
      { path: "sales-history", element: <SalesHistoryPage /> },
      
      // Pacientes y Consultas
      { path: "patients", element: <PatientsPage /> },
      { path: "patients/:id", element: <PatientDetailPage /> },
      { path: "patients/:patientId/consultations/:consultationId", element: <ConsultationDetailPage /> },
      
      // Operaciones y Taller
      { path: "work-orders", element: <WorkOrdersPage /> },
      { path: "inventory", element: <InventoryPage /> },
      { path: "labs", element: <LabsPage /> },
      { path: "suppliers", element: <SuppliersPage /> },
      
      // Finanzas y Administración
      { path: "finance", element: <FinancePage /> },
      { path: "expenses", element: <ExpensesPage /> },
      { path: "receivables", element: <ReceivablesPage /> },
      { path: "payables", element: <PayablesPage /> },
      { path: "payroll", element: <PayrollPage /> },
      { path: "statistics", element: <StatisticsPage /> },
      { path: "shifts", element: <ShiftPage /> },
      { path: "team", element: <TeamPage /> },

      // Utilidades
      { path: "unauthorized", element: <UnauthorizedPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;