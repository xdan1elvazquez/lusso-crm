import { useState, useMemo, useEffect } from "react";
import { getPatients } from "@/services/patientsStorage";
import { getCurrentShift } from "@/services/shiftsStorage";
import SalesPanel from "@/components/SalesPanel";
import LoadingState from "@/components/LoadingState";

// UI Components
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button"; // Opcional si quieres agregar botón de acción futura

export default function SalesPage() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [patients, setPatients] = useState([]);

  useEffect(() => {
      async function loadData() {
          setLoading(true);
          try {
              const [shiftData, patientsData] = await Promise.all([
                  getCurrentShift(),
                  getPatients()
              ]);
              setIsShiftOpen(!!shiftData);
              setPatients(patientsData);
          } catch (e) {
              console.error(e);
          } finally {
              setLoading(false);
          }
      }
      loadData();
  }, []);
  
  const filteredPatients = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return patients.filter(p => 
      p.firstName.toLowerCase().includes(q) || 
      p.lastName.toLowerCase().includes(q) || 
      p.phone.includes(q)
    ).slice(0, 5);
  }, [patients, query]);

  if (loading) return <LoadingState />;

  // ESTADO: CAJA CERRADA
  if (!isShiftOpen) {
      return (
          <div className="h-[80vh] flex flex-col items-center justify-center p-4">
              <Card className="max-w-md w-full text-center py-10 border-red-500/30 bg-red-900/10 shadow-glow">
                  <div className="text-6xl mb-6 opacity-80">⛔</div>
                  <h1 className="text-2xl font-bold text-white mb-3">Caja Cerrada</h1>
                  <p className="text-textMuted mb-6 px-8 leading-relaxed">
                      No hay un turno activo en este momento para realizar ventas.
                  </p>
                  <div className="inline-block bg-surface px-4 py-2 rounded-lg border border-border text-sm text-textMuted">
                      Ve a <strong>Control Turnos</strong> para abrir caja.
                  </div>
              </Card>
          </div>
      );
  }

  return (
    <div className="page-container space-y-6">
      <div className="flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Punto de Venta</h1>
            <p className="text-textMuted text-sm">Gestiona ventas y pedidos</p>
        </div>
        {selectedPatient && (
            <button 
                onClick={() => { setSelectedPatient(null); setQuery(""); }}
                className="text-sm text-primary hover:text-white transition-colors underline decoration-dotted"
            >
                Cambiar Cliente
            </button>
        )}
      </div>

      {/* 1. SELECCIONAR CLIENTE (Solo visible si no hay seleccionado) */}
      {!selectedPatient && (
        <Card className="max-w-2xl mx-auto mt-10 border-primary/30 shadow-glow relative overflow-visible">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>👤</span> Seleccionar Cliente
            </h3>
            
            <div className="relative">
                <Input 
                    placeholder="🔍 Buscar por nombre o teléfono..." 
                    value={query}
                    onChange={e => setQuery(e.target.value)} 
                    className="text-lg py-4"
                    autoFocus
                />
                
                {/* Lista de resultados flotante */}
                {query && filteredPatients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        {filteredPatients.map(p => (
                            <div 
                               key={p.id} 
                               onClick={() => { setSelectedPatient(p); setQuery(`${p.firstName} ${p.lastName}`); }}
                               className="p-4 cursor-pointer hover:bg-primary/20 hover:text-white transition-colors border-b border-border last:border-0 flex justify-between items-center group"
                            >
                                <div>
                                    <div className="font-bold text-textMain group-hover:text-white">{p.firstName} {p.lastName}</div>
                                    <div className="text-xs text-textMuted group-hover:text-blue-200">ID: {p.id.slice(0,6)}</div>
                                </div>
                                <span className="text-sm text-textMuted group-hover:text-white font-mono">{p.phone}</span>
                            </div>
                        ))}
                    </div>
                )}
                
                {query && filteredPatients.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-xl z-50 p-4 text-center text-textMuted">
                        No se encontraron pacientes.
                    </div>
                )}
            </div>
            
            <div className="mt-4 text-center text-xs text-textMuted">
                ¿Cliente nuevo? Ve a <strong className="text-white">Pacientes</strong> para registrarlo primero.
            </div>
        </Card>
      )}

      {/* 2. PANEL DE VENTA (Visible al seleccionar) */}
      {selectedPatient && (
        <div className="animate-[fadeIn_0.3s_ease-out]">
            <div className="mb-4 flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-3 rounded-xl text-blue-300 max-w-fit">
                <span>Cliente Activo:</span>
                <strong className="text-white text-lg">{selectedPatient.firstName} {selectedPatient.lastName}</strong>
            </div>
            
            <SalesPanel 
                patientId={selectedPatient.id} 
                prefillData={null} // Opcional: podrías pasar esto como prop si vienes de otra pantalla
                onClearPrefill={() => {}} 
            />
        </div>
      )}
    </div>
  );
}