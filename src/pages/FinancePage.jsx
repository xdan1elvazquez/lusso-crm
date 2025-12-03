import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getFinancialReport, getProfitabilityReport } from "@/services/salesStorage";
import { getExpensesReport } from "@/services/expensesStorage";
import { getAllShifts } from "@/services/shiftsStorage"; // Usamos los turnos cerrados como historial de cortes
import LoadingState from "@/components/LoadingState";

const CATEGORY_LABELS = { FRAMES: "Armazones", LENSES: "Micas / Lentes", CONTACT_LENS: "Lentes de Contacto", MEDICATION: "Farmacia", ACCESSORY: "Accesorios", CONSULTATION: "Consulta", OTHER: "Otros" };

const getTodayStr = () => new Date().toISOString().slice(0, 10);
const getMonthStr = () => new Date().toISOString().slice(0, 7);

const getMonthRange = (monthStr) => {
    const [y, m] = monthStr.split('-');
    const start = `${monthStr}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${monthStr}-${lastDay}`;
    return { start, end };
};

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("MONTH");
  const [filterValue, setFilterValue] = useState(getMonthStr());
  
  const [financialReport, setFinancial] = useState({ totalIncome: 0, totalSales: 0 });
  const [profitabilityReport, setProfitability] = useState({ global: {sales:0, cost:0, profit:0}, byCategory: {} });
  const [expensesReport, setExpenses] = useState({ totalExpense: 0 });
  const [cuts, setCuts] = useState([]); 

  const startDate = filterType === 'MONTH' ? getMonthRange(filterValue).start : filterValue;
  const endDate = filterType === 'MONTH' ? getMonthRange(filterValue).end : filterValue;
  const label = filterType === 'MONTH' ? `Mes: ${filterValue}` : `Día: ${filterValue}`;

  useEffect(() => {
      async function loadFinance() {
          setLoading(true);
          try {
              // Carga paralela de todos los reportes
              const [fin, prof, exp, allShifts] = await Promise.all([
                  getFinancialReport(startDate, endDate),
                  getProfitabilityReport(startDate, endDate),
                  getExpensesReport(startDate, endDate),
                  getAllShifts()
              ]);
              
              setFinancial(fin);
              setProfitability(prof);
              setExpenses(exp);
              // Filtramos solo los turnos cerrados para el historial de cortes
              setCuts(allShifts.filter(s => s.status === "CLOSED"));
          } catch(e) { 
              console.error(e); 
          } finally { 
              setLoading(false); 
          }
      }
      loadFinance();
  }, [filterValue, filterType]);

  const cashFlowBalance = (financialReport.totalIncome || 0) - (expensesReport.totalExpense || 0);
  
  const pnl = {
      totalSales: profitabilityReport.global.sales,
      costOfGoodsSold: profitabilityReport.global.cost,
      grossProfit: profitabilityReport.global.profit,
      operatingExpenses: expensesReport.totalExpense,
      ebitda: profitabilityReport.global.profit - expensesReport.totalExpense
  };

  if (loading) return <LoadingState />;

  return (
    <div style={{ paddingBottom: 40, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Finanzas</h1>
        <button onClick={() => setFilterValue(filterType==='MONTH'?getMonthStr():getTodayStr())} style={{ background: "#2563eb", border: "none", color: "white", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>🔄</button>
      </div>

      {/* Filtros */}
      <div style={{ background: "#111", padding: 15, borderRadius: 10, border: "1px solid #333", marginBottom: 30, display: "flex", gap: 15, alignItems: "center" }}>
          <span style={{color:"#aaa", fontSize:14, fontWeight:"bold"}}>📅 Periodo:</span>
          <button onClick={() => { setFilterType("DAY"); setFilterValue(getTodayStr()); }} style={{ padding: "6px 12px", borderRadius: 6, border: filterType === "DAY" ? "1px solid #60a5fa" : "1px solid #444", background: filterType === "DAY" ? "#1e3a8a" : "transparent", color: filterType === "DAY" ? "white" : "#888", cursor: "pointer" }}>Día</button>
          <button onClick={() => { setFilterType("MONTH"); setFilterValue(getMonthStr()); }} style={{ padding: "6px 12px", borderRadius: 6, border: filterType === "MONTH" ? "1px solid #60a5fa" : "1px solid #444", background: filterType === "MONTH" ? "#1e3a8a" : "transparent", color: filterType === "MONTH" ? "white" : "#888", cursor: "pointer" }}>Mes</button>
          <input type={filterType === "MONTH" ? "month" : "date"} value={filterValue} onChange={e => setFilterValue(e.target.value)} style={{padding:6, borderRadius:4, background:"#222", color:"white", border:"1px solid #555"}} />
          <div style={{marginLeft:"auto", fontSize:13, color:"#60a5fa", fontWeight:"bold"}}>{label}</div>
      </div>

      {/* KPIs */}
      <h3 style={{ color: "#4ade80", borderBottom: "1px solid #333", paddingBottom: 10 }}>💰 Flujo de Caja</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 20 }}>
        <StatCard label="Ingresos (Cobrado)" value={financialReport.totalIncome} color="#4ade80" />
        <StatCard label="Egresos (Pagado)" value={expensesReport.totalExpense} color="#f87171" />
        <StatCard label="Flujo Neto" value={cashFlowBalance} color={cashFlowBalance >= 0 ? "#60a5fa" : "#f87171"} />
        <StatCard label="Ventas Generadas" value={financialReport.totalSales} color="#fff" />
      </div>

      {/* Accesos Directos */}
      <div style={{ display: "flex", gap: 15, marginBottom: 40, flexWrap:"wrap" }}>
          <Link to="/payables" style={{ flex: 1, textDecoration: "none", minWidth: 200 }}><div style={{ background: "#450a0a", border: "1px solid #f87171", borderRadius: 8, padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fca5a5" }}><span style={{ fontWeight: "bold" }}>📉 Cuentas por Pagar</span><span>Ver Deudas →</span></div></Link>
          <Link to="/receivables" style={{ flex: 1, textDecoration: "none", minWidth: 200 }}><div style={{ background: "#064e3b", border: "1px solid #4ade80", borderRadius: 8, padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#86efac" }}><span style={{ fontWeight: "bold" }}>📈 Cuentas por Cobrar</span><span>Ver Créditos →</span></div></Link>
          <Link to="/payroll" style={{ flex: 1, textDecoration: "none", minWidth: 200 }}><div style={{ background: "#172554", border: "1px solid #60a5fa", borderRadius: 8, padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#bfdbfe" }}><span style={{ fontWeight: "bold" }}>👥 Nómina y Comisiones</span><span>Calcular Pago →</span></div></Link>
      </div>

      {/* Estado de Resultados y Rentabilidad */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 30 }}>
          <div style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#fbbf24" }}>📊 Estado de Resultados</h3>
              <PnLRow label=" (+) Ventas Totales" amount={pnl.totalSales} bold type="neutral" />
              <PnLRow label=" (-) Costo de Ventas" amount={pnl.costOfGoodsSold} type="negative" indent />
              <div style={{ height: 10 }}></div>
              <PnLRow label=" (=) UTILIDAD BRUTA" amount={pnl.grossProfit} bold type="positive" />
              <div style={{ height: 10 }}></div>
              <PnLRow label=" (-) Gastos Operativos" amount={pnl.operatingExpenses} type="negative" indent />
              <div style={{ height: 15, borderBottom: "1px dashed #444" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "15px 0", fontSize: "1.2em", fontWeight: "bold" }}>
                  <div style={{ color: "#fff" }}>(=) OPERACIÓN (EBITDA)</div>
                  <div style={{ color: pnl.ebitda >= 0 ? "#4ade80" : "#f87171" }}>${pnl.ebitda.toLocaleString()}</div>
              </div>
          </div>

          <div>
              <h3 style={{ margin: "0 0 20px 0", color: "#c084fc" }}>📈 Rentabilidad por Área</h3>
              <div style={{background:"#1a1a1a", borderRadius:12, border:"1px solid #333", overflow:"hidden"}}>
                  <table style={{width:"100%", borderCollapse:"collapse", fontSize:"0.9em"}}>
                      <thead>
                          <tr style={{background:"#111", borderBottom:"1px solid #444", color:"#aaa"}}>
                              <th style={{padding:12, textAlign:"left"}}>Área</th>
                              <th style={{padding:12, textAlign:"right"}}>Venta</th>
                              <th style={{padding:12, textAlign:"right"}}>Margen</th>
                          </tr>
                      </thead>
                      <tbody>
                          {Object.entries(profitabilityReport.byCategory).map(([key, data]) => {
                              const marginPercent = data.sales > 0 ? (data.profit / data.sales) * 100 : 0;
                              return (
                                  <tr key={key} style={{borderBottom:"1px solid #222"}}>
                                      <td style={{padding:12, fontWeight:"bold", color:"#ddd"}}>{CATEGORY_LABELS[key] || key}</td>
                                      <td style={{padding:12, textAlign:"right"}}>${data.sales.toLocaleString()}</td>
                                      <td style={{padding:12, textAlign:"right", color: data.profit >= 0 ? "#4ade80" : "#f87171"}}>
                                          ${data.profit.toLocaleString()} <span style={{fontSize:"0.8em", opacity:0.7, marginLeft:4}}>({marginPercent.toFixed(0)}%)</span>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
      
      <h3 style={{ color: "#aaa", borderBottom: "1px solid #333", paddingBottom: 10, marginTop: 40 }}>🗄️ Historial de Cierres de Caja</h3>
      <div style={{ display: "grid", gap: 10 }}>
          {cuts.slice(0, 5).map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: 15, background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, alignItems:"center" }}>
                  <div>
                      <div style={{fontWeight:"bold", color:"white"}}>{new Date(c.closedAt || c.openedAt).toLocaleString()}</div>
                      <div style={{fontSize:"0.85em", color:"#888"}}>Usuario: {c.user}</div>
                  </div>
                  <div style={{fontSize:"0.8em", color:"#666"}}>{c.notes || "Sin notas"}</div>
              </div>
          ))}
      </div>
    </div>
  );
}

const StatCard = ({ label, value, color = "white" }) => (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 12, padding: 20 }}>
      <div style={{ color: "#888", fontSize: "0.85em", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: color }}>${(value||0).toLocaleString()}</div>
    </div>
);

const PnLRow = ({ label, amount, type="neutral", bold=false, indent=false }) => {
    const color = type === "positive" ? "#4ade80" : type === "negative" ? "#f87171" : "#ddd";
    return (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #222", fontSize: "0.95em" }}>
            <div style={{ paddingLeft: indent ? 20 : 0, color: bold ? "white" : "#aaa", fontWeight: bold ? "bold" : "normal" }}>{label}</div>
            <div style={{ color: color, fontWeight: bold ? "bold" : "normal" }}>{type==="negative" && "-"}${Number(amount||0).toLocaleString()}</div>
        </div>
    );
};