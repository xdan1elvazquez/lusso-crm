import React from "react";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import { AuthProvider } from "./context/AuthContext";
import { UIProvider } from "./context/UIContext";
import { NotificationsProvider } from "@/context/NotificationsContext"; // 👈 1. IMPORTAR
import ErrorBoundary from "@/components/ErrorBoundary";
import "./App.css";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <UIProvider>
          {/* 👇 2. ESTE ES EL ENVOLTORIO CLAVE. SIN ESTO, FALLA. */}
          <NotificationsProvider>
             <RouterProvider router={router} />
          </NotificationsProvider>
        </UIProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;