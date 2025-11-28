import { useMemo, useState, useEffect } from "react";
import { getFinancialReport } from "@/services/salesStorage";
import { getExpensesReport } from "@/services/expensesStorage";
import { getTerminals, updateTerminals, getLoyaltySettings, updateLoyaltySettings } from "@/services/settingsStorage";

export default function FinancePage() {
  const [tick, setTick] = useState(0);
  const [isConfiguringTerminals, setIsConfiguringTerminals] = useState(false);
  const [isConfiguringLoyalty, setIsConfiguringLoyalty] = useState(false);

  const [terminals, setTerminals] = useState([]);
  const [loyalty, setLoyalty] = useState(getLoyaltySettings());

  const salesStats = useMemo(() => getFinancialReport(), [tick]);
  const expenseStats = useMemo(() => getExpensesReport(), [tick]);

  const netIncomeMonth = salesStats.incomeMonth - expenseStats.monthTotal;
  const cashInDrawer = salesStats.incomeByMethod.EFECTIVO - expenseStats.cashOutToday;

  useEffect(() => {
    setTerminals(getTerminals());
    setLoyalty(getLoyaltySettings());
  }, [isConfiguringTerminals, isConfiguringLoyalty]);

  // --- HANDLERS TERMINALES ---
  const handleSaveTerminals = (e) => { e.preventDefault(); updateTerminals(terminals); setIsConfiguringTerminals(false); };
  const handleAddTerminal = () => { setTerminals([...terminals, { id: crypto.randomUUID(), name: "Nueva", fee: 0, rates: { 3: 0, 6: 0, 9: 0, 12: 0 } }]); };
  const handleRemoveTerminal = (i) => { setTerminals(terminals.filter((_, idx) => idx !== i)); };
  const handleChangeTerminal = (i, f, v) => { const n = [...terminals]; n[i] = { ...n[i], [f]: v }; setTerminals(n); };
  
  // CLAVE: Editar tasas por meses
  const handleChangeRate = (i, m, v) => { 
      const n = [...terminals]; 
      if(!n[i].rates) n[i].rates={3:0,6:0,9:0,12:0}; 
      n[i].rates[m]=Number(v); 
      setTerminals(n); 
  };

  // --- HANDLERS LEALTAD ---
  const handleSaveLoyalty = (e) => { e.preventDefault(); updateLoyaltySettings(loyalty); setIsConfiguringLoyalty(false); };

  const StatCard = ({ label, value, color = "white", subtext }) => (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 12, padding: 20 }}>
      <div style={{ color: "#888", fontSize: "0.9em", marginBottom: 5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "2rem", fontWeight: "bold", color: color }}>${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
      {subtext && <div style={{ fontSize: "0.85em", color: "#666", marginTop: 5 }}>{subtext}</div>}
    </div>
  );

  return (
    <div style={{ paddingBottom: 40, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h1 style={{ margin: 0 }}>Finanzas</h1>
        <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setIsConfiguringLoyalty(true)} style={{ background: "#1e3a8a", border: "1px solid #60a5fa", color: "#bfdbfe", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>💎 Puntos</button>
            <button onClick={() => setIsConfiguringTerminals(true)} style={{ background: "#333", border: "1px solid #555", color: "#ddd", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>💳 Terminales</button>
            <button onClick={() => setTick(t => t + 1)} style={{ background: "#2563eb", border: "none", color: "white", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>🔄 Actualizar</button>
        </div>
      </div>

      {/* MODAL TERMINALES */}
      {isConfiguringTerminals && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
             <div style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }}>
                <h3 style={{ marginTop: 0 }}>Terminales y Tasas</h3>
                <div style={{ display: "grid", gap: 20, marginBottom: 20 }}>
                    {terminals.map((t, i) => (
                        <div key={i} style={{ background: "#222", padding: 15, borderRadius: 8, border: "1px solid #444" }}>
                            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                                <input value={t.name} onChange={e => handleChangeTerminal(i, 'name', e.target.value)} style={{flex:1, padding:6, background:"#111", border:"1px solid #555", color:"white", fontWeight:"bold"}} placeholder="Nombre" />
                                <div style={{display:"flex", alignItems:"center", gap:5}}>
                                    <span style={{fontSize:11, color:"#aaa"}}>Base:</span>
                                    <input value={t.fee} onChange={e => handleChangeTerminal(i, 'fee', e.target.value)} type="number" style={{width:50, padding:6, background:"#111", border:"1px solid #555", color:"white"}} />
                                    <span>%</span>
                                </div>
                                <button onClick={() => handleRemoveTerminal(i)} style={{background:"transparent", color:"#f87171", border:"none", fontSize:18, cursor:"pointer"}}>×</button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                                {[3, 6, 9, 12].map(m => (
                                    <label key={m} style={{ fontSize: 11, color: "#aaa" }}>{m} Meses
                                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                                            <input type="number" value={t.rates?.[m] || 0} onChange={e => handleChangeRate(i, m, e.target.value)} style={{ width: "100%", padding: 6, background: "#111", border: "1px solid #333", color: "#ddd", borderRadius: 4 }} />%
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                    <button onClick={handleAddTerminal} style={{width:"100%", padding:10, background:"#333", color:"#aaa", border:"1px dashed #555", cursor:"pointer"}}>+ Agregar Terminal</button>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 15 }}>
                    <button onClick={() => setIsConfiguringTerminals(false)} style={{background:"transparent", color:"#aaa", border:"none", cursor:"pointer"}}>Cancelar</button>
                    <button onClick={handleSaveTerminals} style={{background:"#2563eb", color:"white", padding:"8px 16px", borderRadius:4, border:"none", cursor:"pointer"}}>Guardar</button>
                </div>
             </div>
          </div>
      )}

      {/* MODAL LEALTAD */}
      {isConfiguringLoyalty && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
             <form onSubmit={handleSaveLoyalty} style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333", width: "100%", maxWidth: 450 }}>
                <h3 style={{ marginTop: 0, color: "#60a5fa" }}>Puntos Lusso</h3>
                <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer" }}>
                    <input type="checkbox" checked={loyalty.enabled} onChange={e => setLoyalty({...loyalty, enabled: e.target.checked})} />
                    <span>Activar Puntos</span>
                </label>
                <div style={{ display: "grid", gap: 15, opacity: loyalty.enabled ? 1 : 0.5, pointerEvents: loyalty.enabled ? "auto" : "none" }}>
                    <h4 style={{ margin: 0, color: "#aaa", fontSize: "0.9em" }}>% Puntos por Compra</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <label style={{fontSize:12}}>Base<input type="number" value={loyalty.earningRates.GLOBAL} onChange={e => setLoyalty({...loyalty, earningRates: {...loyalty.earningRates, GLOBAL: e.target.value}})} style={{width:"100%", padding:6, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} /></label>
                        <label style={{fontSize:12}}>Efectivo<input type="number" value={loyalty.earningRates.EFECTIVO} onChange={e => setLoyalty({...loyalty, earningRates: {...loyalty.earningRates, EFECTIVO: e.target.value}})} style={{width:"100%", padding:6, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} /></label>
                    </div>
                    <h4 style={{ margin: "10px 0 0 0", color: "#fbbf24", fontSize: "0.9em" }}>Referidos</h4>
                    <label style={{fontSize:12}}>% para Padrino<input type="number" value={loyalty.referralBonusPercent} onChange={e => setLoyalty({...loyalty, referralBonusPercent: e.target.value})} style={{width:"100%", padding:6, background:"#222", border:"1px solid #fbbf24", color:"white", borderRadius:4}} /></label>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                    <button type="button" onClick={() => setIsConfiguringLoyalty(false)} style={{background:"transparent", color:"#aaa", border:"none", cursor:"pointer"}}>Cancelar</button>
                    <button type="submit" style={{background:"#2563eb", color:"white", border:"none", padding:"8px 16px", borderRadius:6, cursor:"pointer"}}>Guardar</button>
                </div>
             </form>
          </div>
      )}

      {/* METRICAS */}
      <h3 style={{ color: "#60a5fa", marginTop: 0 }}>Caja del Día</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 40 }}>
        <StatCard label="Ingreso Hoy" value={salesStats.incomeToday} color="#4ade80" />
        <StatCard label="Ventas Hoy" value={salesStats.salesToday} />
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 12, padding: 20 }}>
            <div style={{ color: "#888", fontSize: "0.9em", marginBottom: 5 }}>EFECTIVO EN CAJÓN</div>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: cashInDrawer >= 0 ? "#4ade80" : "#f87171" }}>${cashInDrawer.toLocaleString()}</div>
        </div>
      </div>

      <h3 style={{ color: "#c084fc" }}>Mensual</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <StatCard label="Ingreso Mes" value={salesStats.incomeMonth} color="#c084fc" />
        <StatCard label="Gastos Mes" value={expenseStats.monthTotal} color="#f87171" />
        <StatCard label="Utilidad" value={netIncomeMonth} color={netIncomeMonth >= 0 ? "#4ade80" : "#f87171"} />
      </div>
    </div>
  );
}