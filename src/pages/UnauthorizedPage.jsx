import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { createEmployee } from "@/services/employeesStorage";

export default function UnauthorizedPage() {
  const { user, role } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelfPromote = async () => {
    if (!user || !user.email) return;
    
    setIsProcessing(true);
    try {
      // Te creamos como empleado con permisos de DIOS (Admin)
      await createEmployee({
        name: user.displayName || "Admin Inicial",
        email: user.email,
        role: "ADMIN",
        baseSalary: 0,
        commissionPercent: 0
      });
      
      alert(`¡Listo! Ahora el usuario ${user.email} es ADMIN.\n\nEl sistema se recargará para aplicar los permisos.`);
      window.location.href = "/dashboard"; // Recarga forzada para refrescar el AuthContext
    } catch (error) {
      console.error(error);
      alert("Error al asignar permisos: " + error.message);
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ 
      height: "80vh", display: "flex", flexDirection: "column", 
      alignItems: "center", justifyContent: "center", textAlign: "center", color: "#ccc" 
    }}>
      <div style={{ fontSize: "4rem", marginBottom: 20 }}>🚫</div>
      <h1 style={{ color: "#e5e7eb" }}>Acceso Restringido</h1>
      <p style={{ maxWidth: 400, marginBottom: 30 }}>
        No tienes permisos para ver esta sección.<br/>
        Tu rol actual es: <strong style={{ color: "#f87171" }}>{role}</strong>
      </p>

      <div style={{ display: "flex", gap: 15 }}>
        <Link to="/dashboard" style={{ padding: "10px 20px", borderRadius: 6, border: "1px solid #555", color: "white", textDecoration: "none" }}>
          Volver al Dashboard
        </Link>
        
        {/* BOTÓN DE RESCATE (Solo visible si eres GUEST) */}
        {role === "GUEST" && (
            <button 
                onClick={handleSelfPromote} 
                disabled={isProcessing}
                style={{ 
                    padding: "10px 20px", borderRadius: 6, border: "none", 
                    background: "#2563eb", color: "white", fontWeight: "bold", cursor: "pointer" 
                }}
            >
                {isProcessing ? "Procesando..." : "👑 Soy el Dueño (Auto-asignar Admin)"}
            </button>
        )}
      </div>
      
      {role === "GUEST" && (
          <p style={{marginTop: 20, fontSize: "0.8em", color: "#666"}}>
              * Este botón es una herramienta de desarrollo para el primer uso.
          </p>
      )}
    </div>
  );
}