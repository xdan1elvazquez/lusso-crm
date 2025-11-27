// src/router.jsx
import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { isAuthed } from "./auth";

import AppLayout from "./layouts/AppLayout.jsx";

import DashboardPage from "./pages/DashboardPage.jsx";
import PatientsPage from "./pages/PatientsPage.jsx";
import PatientDetailPage from "./pages/PatientDetailPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotFound from "./pages/NotFound.jsx";

// (Opcional) Solo si de verdad existe ese archivo y lo quieres usar luego.
import UnauthorizedPage from "./pages/UnauthorizedPage.jsx";

function RequireAuth({ children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return children;
}

const router = createBrowserRouter([
  // Público
  { path: "/login", element: <LoginPage /> },

  // Protegido + con layout
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

      // (Opcional) más adelante para roles/permisos
      { path: "unauthorized", element: <UnauthorizedPage /> },

      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;

