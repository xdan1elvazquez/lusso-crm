import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // 👈 Usar el hook real

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth(); // 👈 Acceder a Firebase
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Si ya está logueado, redirigir
  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      setError("Credenciales incorrectas o error de conexión.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form onSubmit={onSubmit} style={{ width: 360, display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Lusso CRM</h1>
        <p style={{ margin: 0, opacity: 0.7 }}>Inicia sesión (Firebase)</p>

        {error && <div style={{color: "red", fontSize: "0.9em"}}>{error}</div>}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@lusso.mx"
          required
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />
        
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          required
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />

        <button type="submit" style={{ padding: 10, borderRadius: 10, cursor: "pointer" }}>
          Entrar
        </button>
      </form>
    </div>
  );
}