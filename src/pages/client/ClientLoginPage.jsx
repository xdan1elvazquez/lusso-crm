import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientLogin } from "@/services/clientService";
import Card from "@/components/ui/Card";
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
      sessionStorage.setItem("lusso_client_session", JSON.stringify(patient));
      navigate("/portal/tracker");
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col items-center justify-center pt-10">
      
      <div className="text-center mb-8">
        <h2 className="text-xl font-medium text-white mb-1">Bienvenido</h2>
        <p className="text-slate-500 text-sm font-light">
            Ingresa tus datos para localizar tu orden
        </p>
      </div>

      <Card className="w-full max-w-md border-t border-white/5 bg-slate-900/50 backdrop-blur-sm shadow-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs text-center">{error}</div>}
          
          <Input 
            label="Correo Electrónico" type="email" placeholder="cliente@email.com"
            value={form.email} onChange={e => setForm({...form, email: e.target.value})} required
            className="bg-slate-950 border-slate-800 focus:border-white/20 text-white"
          />
          
          <Input 
            label="Fecha de Nacimiento" type="date"
            value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} required
            className="bg-slate-950 border-slate-800 focus:border-white/20 text-white"
          />

          <button 
            type="submit" disabled={loading}
            className="w-full py-3 px-4 rounded-lg font-bold bg-white text-slate-900 hover:bg-slate-200 transition-colors shadow-lg disabled:opacity-50"
          >
            {loading ? "Buscando..." : "Consultar"}
          </button>
        </form>
      </Card>
    </div>
  );
}