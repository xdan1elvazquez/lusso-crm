import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { updateBranchFiscalData } from "@/services/branchStorage";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function FiscalSettings() {
  const { currentBranch, refreshBranchSettings } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Estado local del formulario
  const [formData, setFormData] = useState({
    taxName: "",
    rfc: "",
    taxRegime: "",
    address: "",
    cp: "",
    city: "",
    phone: ""
  });

  // Cargar datos actuales al abrir
  useEffect(() => {
    if (currentBranch?.fiscalData) {
      setFormData(currentBranch.fiscalData);
    }
  }, [currentBranch]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Guardamos en Firebase usando el ID de la sucursal actual
      await updateBranchFiscalData(currentBranch.id, formData);
      
      // Recargamos el contexto para que el ticket se actualice al instante
      await refreshBranchSettings();
      
      alert("✅ Datos fiscales actualizados correctamente.");
    } catch (error) {
      console.error(error);
      alert("Error al guardar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto p-6 bg-surface border border-border">
      <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Datos Fiscales (Ticket)</h2>
          <p className="text-sm text-textMuted">Configura el encabezado legal para: <span className="text-primary font-bold">{currentBranch.name}</span></p>
        </div>
        <div className="text-3xl">🏛️</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="md:col-span-2">
          <Input 
            label="Nombre / Razón Social" 
            name="taxName" 
            value={formData.taxName} 
            onChange={handleChange} 
            placeholder="Ej. Dr. Daniel Vázquez o Lusso S.A. de C.V."
          />
        </div>

        <Input 
          label="RFC Emisor" 
          name="rfc" 
          value={formData.rfc} 
          onChange={handleChange} 
          placeholder="XAXX010101000"
        />

        <Input 
          label="Régimen Fiscal" 
          name="taxRegime" 
          value={formData.taxRegime} 
          onChange={handleChange} 
          placeholder="Ej. Régimen Simplificado de Confianza"
        />

        <div className="md:col-span-2">
          <Input 
            label="Dirección Fiscal (Calle y Número)" 
            name="address" 
            value={formData.address} 
            onChange={handleChange} 
            placeholder="Av. Principal 123, Col. Centro"
          />
        </div>

        <Input 
          label="Código Postal (Lugar de Expedición)" 
          name="cp" 
          value={formData.cp} 
          onChange={handleChange} 
          placeholder="06000"
        />

        <Input 
          label="Ciudad / Estado" 
          name="city" 
          value={formData.city} 
          onChange={handleChange} 
          placeholder="CDMX, México"
        />

        <Input 
          label="Teléfono (Aparece en Ticket)" 
          name="phone" 
          value={formData.phone} 
          onChange={handleChange} 
          placeholder="55 1234 5678"
        />

      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} disabled={loading} className="w-full md:w-auto min-w-[200px]">
          {loading ? "Guardando..." : "💾 Guardar Cambios"}
        </Button>
      </div>
    </Card>
  );
}