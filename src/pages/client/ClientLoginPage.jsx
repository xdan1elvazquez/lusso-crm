import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientLogin } from "@/services/clientService";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ClientLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", dob: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const patient = await clientLogin(form.email, form.dob);
      // Guardamos sesión temporal en sessionStorage (se borra al cerrar pestaña)
      sessionStorage.setItem("lusso_client_session", JSON.stringify(patient));
      navigate("/portal/tracker");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center pt-10 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">👓</div>
        <h1 className="text-2xl font-bold text-white">Rastreo de Pedido</h1>
        <p className="text-slate-400 text-sm">Ingresa tus datos para ver el estado de tus lentes.</p>
      </div>

      <Card className="w-full border-blue-500/20 shadow-glow bg-slate-900/80">
        <form onSubmit={handleSubmit} className="space-y-6 p-2">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">
              {error}
            </div>
          )}
          
          <Input 
            label="Tu Correo Electrónico" 
            type="email" 
            placeholder="ejemplo@correo.com"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
            required
          />
          
          <Input 
            label="Fecha de Nacimiento" 
            type="date"
            value={form.dob}
            onChange={e => setForm({...form, dob: e.target.value})}
            required
          />

          <Button type="submit" className="w-full shadow-lg shadow-blue-900/20" disabled={loading}>
            {loading ? "Buscando..." : "Ver Mis Lentes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}