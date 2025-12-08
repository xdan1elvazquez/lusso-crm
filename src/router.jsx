// src/router.jsx
import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout.jsx";
import ProtectedRoute from "@/components/ProtectedRoute.jsx"; // 👈 IMPORTAR

// ... (imports de páginas igual que antes) ...
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

import ClientLayout from "@/layouts/ClientLayout";
import ClientLoginPage from "@/pages/client/ClientLoginPage";
import ClientTrackerPage from "@/pages/client/ClientTrackerPage";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },

  {
    path: "/portal",
    element: <ClientLayout />,
    children: [
        { index: true, element: <Navigate to="login" replace /> },
        { path: "login", element: <ClientLoginPage /> },
        { path: "tracker", element: <ClientTrackerPage /> }
    ]
  },

  {
    path: "/",
    element: <AppLayout />, // El Layout maneja la estructura visual
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      
      // 🟢 ACCESO PÚBLICO (Cualquier empleado logueado)
      { element: <ProtectedRoute />, children: [
          { path: "unauthorized", element: <UnauthorizedPage /> },
          { path: "dashboard", element: <DashboardPage /> },
      ]},

      // 🔵 ÁREA CLÍNICA (Doctores y Ventas)
      { element: <ProtectedRoute allowedRoles={["ADMIN", "DOCTOR", "SALES"]} />, children: [
          { path: "patients", element: <PatientsPage /> },
          { path: "patients/:id", element: <PatientDetailPage /> },
          { path: "work-orders", element: <WorkOrdersPage /> },
          { path: "sales", element: <SalesPage /> },
          { path: "sales-history", element: <SalesHistoryPage /> },
          { path: "receivables", element: <ReceivablesPage /> },
      ]},

      // 🟡 EXPEDIENTE MÉDICO PROFUNDO (Solo Doctores)
      { element: <ProtectedRoute allowedRoles={["ADMIN", "DOCTOR"]} />, children: [
          { path: "patients/:patientId/consultations/:consultationId", element: <ConsultationDetailPage /> },
      ]},

      // 🔴 ÁREA ADMINISTRATIVA / GERENCIAL (Solo Admin)
      { element: <ProtectedRoute allowedRoles={["ADMIN"]} />, children: [
          { path: "finance", element: <FinancePage /> },
          { path: "expenses", element: <ExpensesPage /> },
          { path: "payables", element: <PayablesPage /> },
          { path: "payroll", element: <PayrollPage /> },
          { path: "statistics", element: <StatisticsPage /> },
          { path: "shifts", element: <ShiftPage /> },
          { path: "inventory", element: <InventoryPage /> },
          { path: "labs", element: <LabsPage /> },
          { path: "suppliers", element: <SuppliersPage /> },
          { path: "team", element: <TeamPage /> },
      ]},

      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;