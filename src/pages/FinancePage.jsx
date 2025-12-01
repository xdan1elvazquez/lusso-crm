import { useMemo, useState, useEffect } from "react";
import { getFinancialReport, getProfitabilityReport } from "@/services/salesStorage";
import { getExpensesReport, getAllExpenses } from "@/services/expensesStorage";
import { getTerminals, updateTerminals, getLoyaltySettings, updateLoyaltySettings } from "@/services/settingsStorage";

const CATEGORY_LABELS = {
    FRAMES: "Armazones",
    LENSES: "Micas / Lentes",
    CONTACT_LENS: "Lentes de Contacto",
    MEDICATION: "Farmacia",
    ACCESSORY: "Accesorios",
    CONSULTATION: "Consulta",
    OTHER: "Otros"
};

export default function FinancePage() {
  const [tick, setTick] = useState(0);
  
  // Hooks de datos
  const financialReport = useMemo(() => getFinancialReport(), [tick]); // Flujo de Caja (Ingresos)
  const profitabilityReport = useMemo(() => getProfitabilityReport(), [tick]); // Rentabilidad (Ventas vs Costos)
  const expensesReport = useMemo(() => getExpensesReport(), [tick]); // Egresos (Gastos)
  const allExpenses = useMemo(() => getAllExpenses(), [tick]);

  // --- CÁLCULOS DEL TABLERO ---
  
  // 1. FLUJO DE CAJA REAL (Dinero en mano)
  // Ingresos reales (pagos recibidos) - Gastos reales (pagados)
  // Nota: expensesReport.monthTotal incluye todo (luz, inventario, pagos a lab)
  const cashFlowBalance = financialReport.incomeMonth - expensesReport.monthTotal;

  const StatCard = ({ label, value, color = "white", subtext, isCurrency = true }) => (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 12, padding: 20, display:"flex", flexDirection:"column", justifyContent:"center" }}>
      <div style={{ color: "#888", fontSize: "0.85em", marginBottom: 5, textTransform: "uppercase", letterSpacing:"0.5px" }}>{label}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: color }}>
          {isCurrency ? `$${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : value}
      </div>
      {subtext && <div style={{ fontSize: "0.8em", color: "#666", marginTop: 5 }}>{subtext}</div>}
    </div>
  );

  return (
    <div style={{ paddingBottom: 40, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div>
            <h1 style={{ margin: 0 }}>Finanzas & Resultados</h1>
            <p style={{margin:"5px 0 0 0", color:"#888", fontSize:"0.9em"}}>Reporte Mensual (Mes Actual)</p>
        </div>
        <button onClick={() => setTick(t => t + 1)} style={{ background: "#2563eb", border: "none", color: "white", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>🔄 Actualizar</button>
      </div>

      {/* SECCIÓN 1: LA REALIDAD DEL DINERO (CASH FLOW) */}
      <h3 style={{ color: "#4ade80", borderBottom: "1px solid #333", paddingBottom: 10 }}>💰 Flujo de Caja (Dinero Real)</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 40 }}>
        <StatCard 
            label="Ingresos Cobrados (Mes)" 
            value={financialReport.incomeMonth} 
            color="#4ade80" 
            subtext="Dinero que entró a caja/banco"
        />
        <StatCard 
            label="Gastos Totales (Mes)" 
            value={expensesReport.monthTotal} 
            color="#f87171" 
            subtext="Operativos + Inventario + Labs"
        />
        <StatCard 
            label="Flujo Neto" 
            value={cashFlowBalance} 
            color={cashFlowBalance >= 0 ? "#60a5fa" : "#f87171"} 
            subtext="Lo que queda en la bolsa este mes"
        />
        <StatCard 
            label="Ventas Hoy" 
            value={financialReport.salesToday} 
            color="#fff"
            subtext={`Cobrado hoy: $${financialReport.incomeToday.toLocaleString()}`} 
        />
      </div>

      {/* SECCIÓN 2: RENTABILIDAD POR ÁREA (PROFITABILITY) */}
      <h3 style={{ color: "#c084fc", borderBottom: "1px solid #333", paddingBottom: 10, marginTop:40 }}>📈 Rentabilidad del Negocio (Devengado)</h3>
      <p style={{color:"#888", fontSize:"0.9em", marginBottom:20}}>
          Aquí ves cuánto ganas por cada producto vendido, descontando su costo individual y de laboratorio. 
          <br/><span style={{fontSize:"0.85em", fontStyle:"italic"}}>(Nota: No incluye gastos fijos como luz o renta, solo costo directo).</span>
      </p>

      <div style={{background:"#1a1a1a", borderRadius:12, border:"1px solid #333", overflow:"hidden", marginBottom:40}}>
          <table style={{width:"100%", borderCollapse:"collapse", fontSize:"0.95em"}}>
              <thead>
                  <tr style={{background:"#111", borderBottom:"1px solid #444", color:"#aaa"}}>
                      <th style={{padding:15, textAlign:"left"}}>Categoría</th>
                      <th style={{padding:15, textAlign:"center"}}>Cant.</th>
                      <th style={{padding:15, textAlign:"right"}}>Venta Total</th>
                      <th style={{padding:15, textAlign:"right"}}>Costo Directo</th>
                      <th style={{padding:15, textAlign:"right"}}>Margen $</th>
                      <th style={{padding:15, textAlign:"right"}}>Margen %</th>
                  </tr>
              </thead>
              <tbody>
                  {Object.entries(profitabilityReport.byCategory).map(([key, data]) => {
                      const marginPercent = data.sales > 0 ? (data.profit / data.sales) * 100 : 0;
                      return (
                          <tr key={key} style={{borderBottom:"1px solid #222"}}>
                              <td style={{padding:15, fontWeight:"bold", color:"#ddd"}}>{CATEGORY_LABELS[key] || key}</td>
                              <td style={{padding:15, textAlign:"center", color:"#aaa"}}>{data.count}</td>
                              <td style={{padding:15, textAlign:"right"}}>${data.sales.toLocaleString()}</td>
                              <td style={{padding:15, textAlign:"right", color:"#f87171"}}>-${data.cost.toLocaleString()}</td>
                              <td style={{padding:15, textAlign:"right", color: data.profit >= 0 ? "#4ade80" : "#f87171", fontWeight:"bold"}}>
                                  ${data.profit.toLocaleString()}
                              </td>
                              <td style={{padding:15, textAlign:"right", color: marginPercent > 50 ? "#4ade80" : "#fbbf24"}}>
                                  {marginPercent.toFixed(1)}%
                              </td>
                          </tr>
                      );
                  })}
                  {/* TOTALES */}
                  <tr style={{background:"#222", fontWeight:"bold", borderTop:"2px solid #444"}}>
                      <td style={{padding:15, color:"#fff"}}>TOTAL GLOBAL</td>
                      <td style={{padding:15, textAlign:"center"}}>-</td>
                      <td style={{padding:15, textAlign:"right"}}>${profitabilityReport.global.sales.toLocaleString()}</td>
                      <td style={{padding:15, textAlign:"right", color:"#f87171"}}>-${profitabilityReport.global.cost.toLocaleString()}</td>
                      <td style={{padding:15, textAlign:"right", color:"#4ade80"}}>${profitabilityReport.global.profit.toLocaleString()}</td>
                      <td style={{padding:15, textAlign:"right"}}>{profitabilityReport.global.sales > 0 ? ((profitabilityReport.global.profit / profitabilityReport.global.sales)*100).toFixed(1) : 0}%</td>
                  </tr>
              </tbody>
          </table>
      </div>

      {/* SECCIÓN 3: GASTOS RECIENTES (DETALLE RÁPIDO) */}
      <h3 style={{ color: "#f87171", borderBottom: "1px solid #333", paddingBottom: 10 }}>💸 Últimos Gastos Registrados</h3>
      <div style={{ display: "grid", gap: 10 }}>
          {allExpenses.slice(0, 5).map(e => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: 15, background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}>
                  <div>
                      <div style={{fontWeight:"bold"}}>{e.description}</div>
                      <div style={{fontSize:"0.85em", color:"#888"}}>{new Date(e.date).toLocaleDateString()} · {e.category} · {e.method}</div>
                  </div>
                  <div style={{fontWeight:"bold", color:"#f87171"}}>-${Number(e.amount).toLocaleString()}</div>
              </div>
          ))}
          <button onClick={() => window.location.href='/expenses'} style={{marginTop:10, padding:10, background:"#333", border:"1px solid #555", color:"#aaa", borderRadius:6, cursor:"pointer"}}>Ver todos los gastos</button>
      </div>

    </div>
  );
}