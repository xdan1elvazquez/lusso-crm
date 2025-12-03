import { useState, useMemo, useEffect } from "react";
import { getPatients } from "@/services/patientsStorage";
import { getCurrentShift } from "@/services/shiftsStorage";
import SalesPanel from "@/components/SalesPanel";
import LoadingState from "@/components/LoadingState";

export default function SalesPage() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [patients, setPatients] = useState([]);

  // Carga inicial de datos desde Firebase
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

  if (!isShiftOpen) {
      return (
          <div style={{ width: "100%", height: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#666" }}>
              <div style={{ fontSize: "4rem", marginBottom: 20 }}>⛔</div>
              <h1>Caja Cerrada</h1>
              <p style={{ fontSize: "1.2em", maxWidth: 400, textAlign: "center" }}>
                  No hay un turno abierto en este momento.
                  <br/><br/>
                  Ve a la sección <strong>Control Turnos</strong> para abrir caja.
              </p>
          </div>
      );
  }

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <h1 style={{ marginBottom: 20 }}>Punto de Venta</h1>

      {/* BUSCADOR DE CLIENTES */}
      <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", marginBottom: 30 }}>
        <h3 style={{ margin: "0 0 10px 0", color: "#60a5fa" }}>1. Seleccionar Cliente</h3>
        <div style={{ position: "relative" }}>
            <input 
              placeholder="Buscar por nombre o teléfono..." 
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedPatient(null); }} 
              style={{ width: "100%", padding: 12, background: "#222", border: "1px solid #444", color: "white", borderRadius: 8, fontSize: "1.1em" }}
            />
            {query && !selectedPatient && filteredPatients.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#222", border: "1px solid #444", zIndex: 50, borderRadius: 8, marginTop: 4, boxShadow: "0 4px 10px rgba(0,0,0,0.5)" }}>
                    {filteredPatients.map(p => (
                        <div 
                           key={p.id} 
                           onClick={() => { setSelectedPatient(p); setQuery(`${p.firstName} ${p.lastName}`); }}
                           style={{ padding: 12, cursor: "pointer", borderBottom: "1px solid #333", display:"flex", justifyContent:"space-between" }}
                           onMouseEnter={(e) => e.target.style.background = "#333"}
                           onMouseLeave={(e) => e.target.style.background = "transparent"}
                        >
                            <strong>{p.firstName} {p.lastName}</strong>
                            <span style={{color:"#888"}}>{p.phone}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {selectedPatient ? (
        <div style={{ animation: "fadeIn 0.3s ease-in" }}>
            <div style={{ marginBottom: 10, color: "#aaa" }}>
                Vendiendo a: <strong style={{color:"white"}}>{selectedPatient.firstName} {selectedPatient.lastName}</strong>
            </div>
            <SalesPanel patientId={selectedPatient.id} />
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>
            🔍 Busca un cliente para iniciar la venta
        </div>
      )}
      
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}