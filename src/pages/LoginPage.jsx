import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Input from "@/components/ui/Input"; // 👈 Usamos el componente
import Button from "@/components/ui/Button"; // 👈 Usamos el componente
import Card from "@/components/ui/Card"; // 👈 Usamos el componente

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // Estado local de carga

  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      setError("Credenciales incorrectas o error de conexión.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617]">
      <Card className="w-full max-w-md bg-[#0f172a] border-slate-800">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Lusso CRM</h1>
          <p className="text-slate-400 text-sm">Sistema de Gestión Clínica</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <Input
            label="Correo Electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@lusso.mx"
            required
            autoFocus
          />
          
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button 
            type="submit" 
            variant="primary" 
            className="w-full h-11 text-base mt-2"
            disabled={loading}
          >
            {loading ? "Iniciando sesión..." : "Entrar al Sistema"}
          </Button>
        </form>
      </Card>
    </div>
  );
}