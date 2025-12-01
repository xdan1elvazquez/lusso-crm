// src/router.jsx
import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { isAuthed } from "./auth";

import AppLayout from "@/layouts/AppLayout.jsx";

import DashboardPage from "@/pages/DashboardPage.jsx";
import PatientsPage from "@/pages/PatientsPage.jsx";
import PatientDetailPage from "@/pages/PatientDetailPage.jsx";
import ConsultationDetailPage from "@/pages/ConsultationDetailPage.jsx";
import WorkOrdersPage from "@/pages/WorkOrdersPage.jsx";
import InventoryPage from "@/pages/InventoryPage.jsx"; // 👈 IMPORTAR ESTO
import LoginPage from "@/pages/LoginPage.jsx";
import NotFound from "@/pages/NotFound.jsx";
import UnauthorizedPage from "@/pages/UnauthorizedPage.jsx";
import SalesPage from "@/pages/SalesPage.jsx"; // 👈 IMPORTAR
import FinancePage from "@/pages/FinancePage.jsx";
import ExpensesPage from "@/pages/ExpensesPage.jsx";
import LabsPage from "@/pages/LabsPage.jsx";
import StatisticsPage from "@/pages/StatisticsPage.jsx";
import ReceivablesPage from "@/pages/ReceivablesPage.jsx";
import TeamPage from "@/pages/TeamPage.jsx";

function RequireAuth({ children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
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
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "patients", element: <PatientsPage /> },
      { path: "patients/:id", element: <PatientDetailPage /> },
      { path: "patients/:patientId/consultations/:consultationId", element: <ConsultationDetailPage /> },
      { path: "work-orders", element: <WorkOrdersPage /> },
      { path: "inventory", element: <InventoryPage /> }, // 👈 AGREGAR ESTA RUTA
      { path: "unauthorized", element: <UnauthorizedPage /> },
      { path: "*", element: <NotFound /> },
      { path: "inventory", element: <InventoryPage /> },
      { path: "sales", element: <SalesPage /> }, 
      { path: "sales", element: <SalesPage /> },
      { path: "finance", element: <FinancePage /> },
      { path: "finance", element: <FinancePage /> },
      { path: "expenses", element: <ExpensesPage /> },
      { path: "labs", element: <LabsPage /> },
      { path: "inventory", element: <InventoryPage /> },
      { path: "statistics", element: <StatisticsPage /> },
      { path: "labs", element: <LabsPage /> },
      { path: "receivables", element: <ReceivablesPage /> },
      { path: "team", element: <TeamPage /> },
    ],
  },
]);

export default router;