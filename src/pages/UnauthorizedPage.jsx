import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { createEmployee } from "@/services/employeesStorage";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function UnauthorizedPage() {
  const { user, role } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelfPromote = async () => {
    if (!user || !user.email) return;
    setIsProcessing(true);
    try {
      await createEmployee({
        name: user.displayName || "Admin Inicial",
        email: user.email,
        role: "ADMIN",
        baseSalary: 0,
        commissionPercent: 0
      });
      alert(`¡Listo! Ahora el usuario ${user.email} es ADMIN.\n\nRecargando...`);
      window.location.href = "/dashboard";
    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center border-red-500/30 bg-red-900/5 p-10">
        <div className="text-6xl mb-6 opacity-80">🚫</div>
        <h1 className="text-2xl font-bold text-white mb-2">Acceso Restringido</h1>
        <p className="text-textMuted mb-6">
          No tienes permisos para ver esta sección.<br/>
          Tu rol actual es: <strong className="text-red-400">{role}</strong>
        </p>

        <div className="flex flex-col gap-3">
          <Link to="/dashboard">
             <Button variant="secondary" className="w-full">Volver al Dashboard</Button>
          </Link>
          
          {role === "GUEST" && (
              <Button onClick={handleSelfPromote} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                  {isProcessing ? "Procesando..." : "👑 Soy el Dueño (Auto-asignar Admin)"}
              </Button>
          )}
        </div>
      </Card>
    </div>
  );
}