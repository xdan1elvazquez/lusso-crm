import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import "./index.css";
import { UIProvider } from "./context/UIContext";
import { AuthProvider } from "./context/AuthContext"; // 👈 IMPORTAR

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <UIProvider>
      <AuthProvider> {/* 👈 ENVOLVER AQUI */}
        <RouterProvider router={router} />
      </AuthProvider>
    </UIProvider>
  </React.StrictMode>
);