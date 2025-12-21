import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout.jsx";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import { PERMISSIONS } from "@/utils/rbacConfig"; 

// ... imports de páginas ...
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
import TicketsPage from "@/pages/TicketsPage.jsx";
import GrowthPage from "@/pages/GrowthPage.jsx";
import PurchasingPage from "@/pages/PurchasingPage.jsx"; 

import ClientLayout from "@/layouts/ClientLayout";
import ClientLoginPage from "@/pages/client/ClientLoginPage";
import ClientTrackerPage from "@/pages/client/ClientTrackerPage";

import QuickQuotePage from "@/pages/QuickQuotePage"; // 👈 Importado correctamente

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
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      
      // DASHBOARD: Requiere permiso básico
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_DASHBOARD} />, children: [
          { path: "unauthorized", element: <UnauthorizedPage /> }, 
          { path: "dashboard", element: <DashboardPage /> },
      ]},

      // CLÍNICA
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_PATIENTS} />, children: [
          { path: "patients", element: <PatientsPage /> },
          { path: "patients/:id", element: <PatientDetailPage /> },
      ]},

      // CONSULTAS
      { element: <ProtectedRoute allowedRoles={["ADMIN", "DOCTOR"]} />, children: [
          { path: "patients/:patientId/consultations/:consultationId", element: <ConsultationDetailPage /> },
      ]},

      // VENTAS (Aquí agregamos el Cotizador)
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_SALES} />, children: [
          { path: "sales", element: <SalesPage /> },
          { path: "quotes", element: <QuickQuotePage /> }, // 👈 NUEVA RUTA
      ]},
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_WORK_ORDERS} />, children: [
          { path: "work-orders", element: <WorkOrdersPage /> },
      ]},
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_SALES_HISTORY} />, children: [
          { path: "sales-history", element: <SalesHistoryPage /> },
      ]},

      // LOGÍSTICA
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_INVENTORY} />, children: [
          { path: "inventory", element: <InventoryPage /> },
      ]},
      
      // 🛍️ RUTA DE COMPRAS INTELIGENTES
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_PURCHASING} />, children: [
          { path: "purchasing", element: <PurchasingPage /> },
      ]},

      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_LABS} />, children: [
          { path: "labs", element: <LabsPage /> },
      ]},
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_SUPPLIERS} />, children: [
          { path: "suppliers", element: <SuppliersPage /> },
      ]},

      // FINANZAS
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_FINANCE} />, children: [
          { path: "finance", element: <FinancePage /> },
      ]},
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_RECEIVABLES} />, children: [
          { path: "receivables", element: <ReceivablesPage /> },
      ]},
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_PAYABLES} />, children: [
          { path: "payables", element: <PayablesPage /> },
      ]},
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_EXPENSES} />, children: [
          { path: "expenses", element: <ExpensesPage /> },
      ]},
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_PAYROLL} />, children: [
          { path: "payroll", element: <PayrollPage /> },
      ]},

      // ADMIN
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_STATISTICS} />, children: [
          { path: "statistics", element: <StatisticsPage /> },
      ]},
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_SHIFTS} />, children: [
          { path: "shifts", element: <ShiftPage /> },
      ]},
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_ADMIN_TEAM} />, children: [
          { path: "team", element: <TeamPage /> },
      ]},

      // TICKETS
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_TICKETS} />, children: [
          { path: "tickets", element: <TicketsPage /> },
      ]},

      // GROWTH CENTER
      { element: <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_GROWTH} />, children: [
          { path: "growth", element: <GrowthPage /> },
      ]},

      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;