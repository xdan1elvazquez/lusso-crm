// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isAuthed, setToken } from "../auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  // si ya hay token, no tiene sentido estar aquí
  if (isAuthed()) return <Navigate to="/dashboard" replace />;

  function onSubmit(e) {
    e.preventDefault();

    // Login fake: guardamos un token.
    // Luego esto se reemplaza por Firebase Auth.
    setToken(`demo-token:${email || "user"}`);

    navigate("/dashboard", { replace: true });
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form onSubmit={onSubmit} style={{ width: 360, display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Lusso CRM</h1>
        <p style={{ margin: 0, opacity: 0.7 }}>Inicia sesión (modo demo)</p>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (opcional)"
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />

        <button type="submit" style={{ padding: 10, borderRadius: 10 }}>
          Entrar
        </button>
      </form>
    </div>
  );
}
