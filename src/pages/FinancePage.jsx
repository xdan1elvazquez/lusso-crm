import { useMemo, useState, useEffect } from "react";
import { getFinancialReport } from "@/services/salesStorage";
import { getTerminals, updateTerminals } from "@/services/settingsStorage";

export default function FinancePage() {
  const [tick, setTick] = useState(0);
  const [isConfiguring, setIsConfiguring] = useState(false);
  
  // Estado de terminales
  const [terminals, setTerminals] = useState([]);

  const stats = useMemo(() => getFinancialReport(), [tick]);

  useEffect(() => {
    setTerminals(getTerminals());
  }, [isConfiguring]); 

  const handleSaveTerminals = (e) => {
    e.preventDefault();
    updateTerminals(terminals);
    setIsConfiguring(false);
  };

  const handleAddTerminal = () => {
    // Ahora inicializamos también el objeto 'rates' para los meses
    setTerminals([...terminals, { 
        id: crypto.randomUUID(), 
        name: "Nueva Terminal", 
        fee: 0, 
        rates: { 3: 0, 6: 0, 9: 0, 12: 0 } 
    }]);
  };

  const handleRemoveTerminal = (index) => {
    const next = terminals.filter((_, i) => i !== index);
    setTerminals(next);
  };

  const handleChangeTerminal = (index, field, value) => {
    const next = [...terminals];
    next[index] = { ...next[index], [field]: value };
    setTerminals(next);
  };

  // Función para editar las tasas específicas de meses
  const handleChangeRate = (termIndex, months, value) => {
    const next = [...terminals];
    const term = next[termIndex];
    // Aseguramos que exista el objeto rates
    if (!term.rates) term.rates = { 3: 0, 6: 0, 9: 0, 12: 0 };
    
    term.rates[months] = Number(value);
    setTerminals(next);
  };

  const StatCard = ({ label, value, color = "white", subtext }) => (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 12, padding: 20 }}>
      <div style={{ color: "#888", fontSize: "0.9em", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontSize: "2rem", fontWeight: "bold", color: color }}>
        ${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
      </div>
      {subtext && <div style={{ fontSize: "0.85em", color: "#666", marginTop: 5 }}>{subtext}</div>}
    </div>
  );

  return (
    <div style={{ paddingBottom: 40, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h1 style={{ margin: 0 }}>Finanzas</h1>
        <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setIsConfiguring(true)} style={{ background: "#333", border: "1px solid #555", color: "#ddd", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>💳 Configurar Terminales</button>
            <button onClick={() => setTick(t => t + 1)} style={{ background: "#2563eb", border: "none", color: "white", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>🔄 Actualizar</button>
        </div>
      </div>

      {/* MODAL DE CONFIGURACIÓN AVANZADA */}
      {isConfiguring && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
            <div style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }}>
                <h3 style={{ marginTop: 0, color: "#e5e7eb" }}>Mis Terminales y Tasas</h3>
                <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Configura la comisión base (Contado) y las sobretasas para Meses Sin Intereses.</p>
                
                <div style={{ display: "grid", gap: 20, marginBottom: 20 }}>
                    {terminals.map((t, i) => (
                        <div key={i} style={{ background: "#222", padding: 15, borderRadius: 8, border: "1px solid #444" }}>
                            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                                <input value={t.name} onChange={e => handleChangeTerminal(i, 'name', e.target.value)} placeholder="Nombre (ej. Clip)" style={{ flex: 1, padding: 8, background: "#111", border: "1px solid #555", color: "white", borderRadius: 4, fontWeight:"bold" }} />
                                <div style={{display:"flex", alignItems:"center", gap:5}}>
                                    <span style={{fontSize:12, color:"#aaa"}}>Base:</span>
                                    <input type="number" value={t.fee} onChange={e => handleChangeTerminal(i, 'fee', e.target.value)} placeholder="%" style={{ width: 50, padding: 8, background: "#111", border: "1px solid #555", color: "white", borderRadius: 4 }} />
                                    <span style={{ color: "#888" }}>%</span>
                                </div>
                                <button onClick={() => handleRemoveTerminal(i)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 18 }}>×</button>
                            </div>

                            {/* GRID DE MESES */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                                {[3, 6, 9, 12].map(m => (
                                    <label key={m} style={{ fontSize: 11, color: "#aaa" }}>
                                        {m} Meses
                                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                                            <input 
                                                type="number" 
                                                value={t.rates?.[m] || 0} 
                                                onChange={e => handleChangeRate(i, m, e.target.value)}
                                                style={{ width: "100%", padding: 6, background: "#111", border: "1px solid #333", color: "#ddd", borderRadius: 4 }} 
                                            />
                                            <span>%</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={handleAddTerminal} style={{ width: "100%", padding: 10, background: "#333", border: "1px dashed #555", color: "#aaa", borderRadius: 6, cursor: "pointer", marginBottom: 20 }}>+ Agregar Terminal</button>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #333", paddingTop: 15 }}>
                    <button onClick={() => setIsConfiguring(false)} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
                    <button onClick={handleSaveTerminals} style={{ background: "#2563eb", color: "white", border: "none", padding: "8px 20px", borderRadius: 6, cursor: "pointer" }}>Guardar Configuración</button>
                </div>
            </div>
        </div>
      )}

      {/* SECCIÓN 1: RESUMEN DE CAJA */}
      <h3 style={{ color: "#60a5fa", marginTop: 0 }}>Caja del Día</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 40 }}>
        <StatCard label="Ingreso Hoy" value={stats.incomeToday} color="#4ade80" subtext="Efectivo + Bancos" />
        <StatCard label="Ventas Hoy" value={stats.salesToday} subtext="Notas cerradas hoy" />
      </div>

      {/* SECCIÓN 2: MES ACTUAL */}
      <h3 style={{ color: "#c084fc" }}>Resumen Mensual</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 40 }}>
        <StatCard label="Ingreso Mensual" value={stats.incomeMonth} color="#c084fc" />
        <StatCard label="Ventas Totales Mes" value={stats.salesMonth} />
        <StatCard label="Por Cobrar" value={stats.totalReceivable} color="#f87171" subtext="Saldo de clientes" />
      </div>

      {/* SECCIÓN 3: DESGLOSE Y GASTOS POR COMISIÓN */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 30 }}>
          <div>
            <h3 style={{ color: "#aaa" }}>Ingresos por Método</h3>
            <div style={{ display: "grid", gap: 10 }}>
                {Object.entries(stats.incomeByMethod).map(([method, amount]) => (
                <div key={method} style={{ background: "#111", border: "1px solid #333", borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#888" }}>{method}</span>
                    <span style={{ fontWeight: "bold", color: "white" }}>${amount.toLocaleString()}</span>
                </div>
                ))}
            </div>
          </div>
          
          <div>
            <h3 style={{ color: "#f87171" }}>Gasto en Comisiones</h3>
            <div style={{ background: "#111", border: "1px solid #333", borderRadius: 8, padding: 15 }}>
                <div style={{ fontSize: "2em", fontWeight: "bold", color: "#f87171", marginBottom: 5 }}>
                    ${stats.totalFees?.toLocaleString("es-MX", { minimumFractionDigits: 2 }) || "0.00"}
                </div>
                <div style={{ fontSize: "0.9em", color: "#888" }}>
                    Dinero retenido por terminales este mes.
                </div>
            </div>
          </div>
      </div>
    </div>
  );
}