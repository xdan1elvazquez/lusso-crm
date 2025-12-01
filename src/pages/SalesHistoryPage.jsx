import { useState, useMemo } from "react";
import { getAllSales, deleteSale } from "@/services/salesStorage";
import { getPatientById } from "@/services/patientsStorage";
import SaleDetailModal from "@/components/SaleDetailModal";

const CATEGORIES = [
  { id: "ALL", label: "Todas las categorías" },
  { id: "LENSES", label: "Lentes / Micas" },
  { id: "FRAMES", label: "Armazones" },
  { id: "CONTACT_LENS", label: "Lentes de Contacto" },
  { id: "MEDICATION", label: "Farmacia" },
  { id: "CONSULTATION", label: "Consulta" },
  { id: "ACCESSORY", label: "Accesorios" },
  { id: "OTHER", label: "Otros" },
];

export default function SalesHistoryPage() {
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [viewSale, setViewSale] = useState(null);

  const sales = useMemo(() => getAllSales(), [tick]);

  const filtered = useMemo(() => {
    return sales.filter(s => {
      // 1. Filtro Texto (ID, Paciente, Monto)
      const patient = getPatientById(s.patientId);
      const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Publico General";
      const textMatch = 
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        patientName.toLowerCase().includes(search.toLowerCase()) ||
        s.total.toString().includes(search);
      
      if (!textMatch) return false;

      // 2. Filtro Categoría
      if (category !== "ALL" && s.kind !== category) return false;

      // 3. Filtro Fechas
      const sDate = s.createdAt.slice(0, 10);
      if (dateRange.start && sDate < dateRange.start) return false;
      if (dateRange.end && sDate > dateRange.end) return false;

      return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [sales, search, category, dateRange]);

  const handleDelete = (id) => {
    if(confirm("¿Estás seguro de cancelar esta venta? Se revertirá el inventario y los puntos.")) {
      deleteSale(id);
      setTick(t => t + 1);
    }
  };

  const handlePrint = (sale) => {
    // Aquí podrías conectar tu función de impresión real
    alert(`🖨️ Imprimiendo ticket de venta #${sale.id.slice(0,6)}...`);
  };

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <h1 style={{ marginBottom: 20 }}>Historial de Ventas</h1>

      {/* BARRA DE FILTROS */}
      <div style={{ background: "#1a1a1a", padding: 15, borderRadius: 12, border: "1px solid #333", marginBottom: 20, display: "flex", gap: 15, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{flex: 1, minWidth: 200}}>
              <span style={{fontSize:12, color:"#aaa", display:"block", marginBottom:5}}>Buscar (Folio, Paciente, Monto)</span>
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Escribe para buscar..." 
                style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}} 
              />
          </label>
          
          <label>
              <span style={{fontSize:12, color:"#aaa", display:"block", marginBottom:5}}>Categoría</span>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value)} 
                style={{width:180, padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}}
              >
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
          </label>

          <label>
              <span style={{fontSize:12, color:"#aaa", display:"block", marginBottom:5}}>Desde</span>
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => setDateRange({...dateRange, start: e.target.value})} 
                style={{padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}} 
              />
          </label>

          <label>
              <span style={{fontSize:12, color:"#aaa", display:"block", marginBottom:5}}>Hasta</span>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => setDateRange({...dateRange, end: e.target.value})} 
                style={{padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:6}} 
              />
          </label>

          <button onClick={() => { setSearch(""); setCategory("ALL"); setDateRange({start:"", end:""}); }} style={{padding:"8px 12px", background:"#333", border:"1px solid #555", color:"#ccc", borderRadius:6, cursor:"pointer"}}>
              Limpiar
          </button>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
              <thead>
                  <tr style={{ background: "#111", color: "#aaa", textAlign: "left", borderBottom: "1px solid #444" }}>
                      <th style={{ padding: 12 }}>Fecha</th>
                      <th style={{ padding: 12 }}>Folio</th>
                      <th style={{ padding: 12 }}>Paciente</th>
                      <th style={{ padding: 12 }}>Detalle</th>
                      <th style={{ padding: 12 }}>Total</th>
                      <th style={{ padding: 12 }}>Estado</th>
                      <th style={{ padding: 12, textAlign: "right" }}>Acciones</th>
                  </tr>
              </thead>
              <tbody>
                  {filtered.length === 0 ? (
                      <tr><td colSpan="7" style={{padding:30, textAlign:"center", color:"#666"}}>No se encontraron ventas con esos filtros.</td></tr>
                  ) : (
                      filtered.map(s => {
                          const patient = getPatientById(s.patientId);
                          return (
                              <tr key={s.id} style={{ borderBottom: "1px solid #222" }}>
                                  <td style={{ padding: 12, color: "#ccc" }}>
                                      {new Date(s.createdAt).toLocaleDateString()} 
                                      <div style={{fontSize:"0.8em", color:"#666"}}>{new Date(s.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                  </td>
                                  <td style={{ padding: 12, fontFamily: "monospace", color: "#60a5fa" }}>#{s.id.slice(0,6).toUpperCase()}</td>
                                  <td style={{ padding: 12, fontWeight: "bold" }}>{patient ? `${patient.firstName} ${patient.lastName}` : "General"}</td>
                                  <td style={{ padding: 12, color: "#aaa" }}>
                                      <div>{s.description}</div>
                                      <div style={{fontSize:"0.8em", color:"#666"}}>{s.kind}</div>
                                  </td>
                                  <td style={{ padding: 12, fontWeight: "bold", color: "#fff" }}>${s.total.toLocaleString()}</td>
                                  <td style={{ padding: 12 }}>
                                      <span style={{ 
                                          padding: "2px 8px", borderRadius: 10, fontSize: "0.85em", fontWeight: "bold",
                                          background: s.balance <= 0 ? "rgba(74, 222, 128, 0.1)" : "rgba(248, 113, 113, 0.1)",
                                          color: s.balance <= 0 ? "#4ade80" : "#f87171"
                                      }}>
                                          {s.balance <= 0 ? "PAGADO" : "PENDIENTE"}
                                      </span>
                                  </td>
                                  <td style={{ padding: 12, textAlign: "right" }}>
                                      <button onClick={() => setViewSale(s)} style={{ marginRight: 8, background: "none", border: "none", cursor: "pointer", fontSize:"1.2em" }} title="Ver Detalle">👁️</button>
                                      <button onClick={() => handlePrint(s)} style={{ marginRight: 8, background: "none", border: "none", cursor: "pointer", fontSize:"1.2em" }} title="Imprimir Nota">🖨️</button>
                                      <button onClick={() => handleDelete(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize:"1.2em" }} title="Cancelar Venta">✕</button>
                                  </td>
                              </tr>
                          );
                      })
                  )}
              </tbody>
          </table>
      </div>

      {viewSale && <SaleDetailModal sale={viewSale} patient={getPatientById(viewSale.patientId)} onClose={() => setViewSale(null)} onUpdate={() => setTick(t => t + 1)} />}
    </div>
  );
}