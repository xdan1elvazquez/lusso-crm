import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Componentes Nuevos
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
      
      {/* Contenedor central animado */}
      <div className="w-full max-w-md animate-[fadeIn_0.5s_ease-out]">
        
        {/* Branding Minimalista */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            Lusso<span className="text-primary">CRM</span>
          </h1>
          <p className="text-textMuted text-sm">Sistema de Gestión Clínica Integral</p>
        </div>

        <Card className="border-primary/20 shadow-glow bg-surface/50 backdrop-blur-sm">
          
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <Input
              label="Correo Electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@lusso.mx"
              required
              autoFocus
              className="bg-surfaceHighlight" // Un poco más claro para contraste
            />
            
            <div className="space-y-1">
              <Input
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-surfaceHighlight"
              />
              <div className="text-right">
                <a href="#" className="text-xs text-primary hover:text-primaryHover transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full h-12 text-base shadow-lg shadow-blue-900/20"
              disabled={loading}
            >
              {loading ? "Iniciando sesión..." : "Entrar al Sistema"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-textMuted mt-8 opacity-50">
          © {new Date().getFullYear()} Lusso Visual. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}