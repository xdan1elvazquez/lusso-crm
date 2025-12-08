import React, { useState, useEffect } from "react";
import { getTerminals, updateTerminals } from "@/services/settingsStorage";
import ModalWrapper from "@/components/ui/ModalWrapper";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function TerminalsManager({ onClose }) {
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar configuración existente
  useEffect(() => {
    getTerminals().then((data) => {
      // Aseguramos que cada terminal tenga la estructura de 'rates' para evitar errores
      const safeData = (data || []).map(t => ({
        ...t,
        rates: t.rates || { 3: 0, 6: 0, 9: 0, 12: 0 }
      }));
      setTerminals(safeData);
      setLoading(false);
    });
  }, []);

  const handleAdd = () => {
    const newTerm = {
      id: `term_${Date.now()}`,
      name: "Nueva Terminal",
      fee: 3.5, // Comisión default pago directo
      rates: { 3: 0, 6: 0, 9: 0, 12: 0 } // Comisión default meses
    };
    setTerminals([...terminals, newTerm]);
  };

  const handleChange = (id, field, value) => {
    setTerminals(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleRateChange = (id, month, value) => {
    setTerminals(prev => prev.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        rates: { ...t.rates, [month]: parseFloat(value) || 0 }
      };
    }));
  };

  const handleDelete = (id) => {
    if (!confirm("¿Eliminar terminal? Esto no afectará las ventas históricas.")) return;
    setTerminals(prev => prev.filter(t => t.id !== id));
  };

  const handleSave = async () => {
    await updateTerminals(terminals);
    alert("Configuración de terminales guardada exitosamente.");
    onClose();
  };

  return (
    <ModalWrapper title="Configurar Terminales y Comisiones" onClose={onClose} width="800px">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
        {loading && <p className="text-textMuted text-center">Cargando configuración...</p>}
        
        {!loading && terminals.length === 0 && (
          <div className="text-center py-8 text-textMuted border border-dashed border-border rounded-xl">
            No hay terminales configuradas. Agrega una para comenzar.
          </div>
        )}

        {terminals.map((term) => (
          <Card key={term.id} noPadding className="p-4 border-l-4 border-l-blue-500 bg-surfaceHighlight/5">
            {/* Cabecera de la Terminal */}
            <div className="flex justify-between items-start mb-4 border-b border-border/50 pb-3">
              <div className="w-1/2">
                <Input 
                  label="Nombre de la Terminal" 
                  value={term.name} 
                  onChange={e => handleChange(term.id, "name", e.target.value)} 
                  className="font-bold text-white"
                  placeholder="Ej. Clip, MercadoPago..."
                />
              </div>
              <button 
                onClick={() => handleDelete(term.id)} 
                className="text-red-400 hover:text-red-300 text-xs px-3 py-2 hover:bg-red-500/10 rounded transition-colors"
              >
                Eliminar
              </button>
            </div>

            {/* Grid de Tasas */}
            <div className="grid grid-cols-5 gap-3 items-end">
              {/* Comisión Directa (1 Pago) */}
              <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/30">
                <label className="block text-[10px] text-blue-300 uppercase font-bold mb-1 text-center">1 Pago (Directo)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={term.fee} 
                    onChange={e => handleChange(term.id, "fee", parseFloat(e.target.value) || 0)} 
                    className="w-full bg-background border border-blue-500/30 rounded text-center text-white py-1 focus:border-blue-500 outline-none text-sm font-bold"
                  />
                  <span className="absolute right-2 top-1 text-xs text-textMuted">%</span>
                </div>
              </div>

              {/* Meses Sin Intereses */}
              {[3, 6, 9, 12].map(m => (
                <div key={m} className="bg-surface p-2 rounded-lg border border-border group hover:border-border/80 transition-colors">
                  <label className="block text-[10px] text-textMuted uppercase font-bold mb-1 text-center group-hover:text-gray-300">{m} Meses</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={term.rates?.[m] || 0} 
                      onChange={e => handleRateChange(term.id, m, e.target.value)} 
                      className="w-full bg-background border border-border rounded text-center text-textMuted focus:text-white py-1 focus:border-primary outline-none text-sm"
                    />
                    <span className="absolute right-1 top-1 text-xs text-textMuted opacity-50">%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
        <Button variant="secondary" onClick={handleAdd}>+ Nueva Terminal</Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} className="shadow-glow">Guardar Cambios</Button>
        </div>
      </div>
    </ModalWrapper>
  );
}