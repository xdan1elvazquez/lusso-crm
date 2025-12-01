import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getFinancialReport, getProfitabilityReport } from "@/services/salesStorage";
import { getExpensesReport, getAllExpenses } from "@/services/expensesStorage";
import { createCut, getAllCuts } from "@/services/cashCountStorage";

const CATEGORY_LABELS = {
    FRAMES: "Armazones",
    LENSES: "Micas / Lentes",
    CONTACT_LENS: "Lentes de Contacto",
    MEDICATION: "Farmacia",
    ACCESSORY: "Accesorios",
    CONSULTATION: "Consulta",
    OTHER: "Otros"
};

// Helpers de fechas
const getTodayStr = () => new Date().toISOString().slice(0, 10);
const getMonthStr = () => new Date().toISOString().slice(0, 7);

const getWeekRange = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDay(); // 0 (Sun) - 6 (Sat)
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar al Lunes
    const monday = new Date(date.setDate(diff));
    const sunday = new Date(date.setDate(monday.getDate() + 6));
    return { start: monday.toISOString().slice(0,10), end: sunday.toISOString().slice(0,10) };
};

const getMonthRange = (monthStr) => {
    const [y, m] = monthStr.split('-');
    const start = `${monthStr}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${monthStr}-${lastDay}`;
    return { start, end };
};

const getYearRange = (year) => ({ start: `${year}-01-01`, end: `${year}-12-31` });

export default function FinancePage() {
  const [tick, setTick] = useState(0);
  const [showCutModal, setShowCutModal] = useState(false);
  
  // ESTADO DE FILTROS
  const [filterType, setFilterType] = useState("MONTH"); // DAY, WEEK, MONTH, YEAR
  const [filterValue, setFilterValue] = useState(getMonthStr()); // Valor del input (fecha, mes, etc.)

  // Calcular rangos Start/End basados en el filtro
  const { startDate, endDate, label } = useMemo(() => {
      let start = "", end = "", lbl = "";
      if (filterType === "DAY") {
          start = filterValue; end = filterValue; lbl = `Día: ${filterValue}`;
      } else if (filterType === "WEEK") {
          // input type="week" devuelve "2025-W48"
          // Si el navegador no lo soporta bien, usamos fecha y calculamos semana
          // Para simplificar, asumiremos que filterValue es una fecha dentro de la semana
          // O usamos el input week nativo si funciona.
          // Vamos a usar un input date y calcular la semana de esa fecha para maximizar compatibilidad.
          const range = getWeekRange(filterValue || getTodayStr());
          start = range.start; end = range.end; lbl = `Semana: ${start} al ${end}`;
      } else if (filterType === "MONTH") {
          const range = getMonthRange(filterValue);
          start = range.start; end = range.end; lbl = `Mes: ${filterValue}`;
      } else if (filterType === "YEAR") {
          const range = getYearRange(filterValue); // filterValue es "2025"
          start = range.start; end = range.end; lbl = `Año: ${filterValue}`;
      }
      return { startDate: start, endDate: end, label: lbl };
  }, [filterType, filterValue]);

  // Hooks de datos (AHORA RECIBEN FECHAS)
  const financialReport = useMemo(() => getFinancialReport(startDate, endDate), [startDate, endDate, tick]);
  const profitabilityReport = useMemo(() => getProfitabilityReport(startDate, endDate), [startDate, endDate, tick]);
  const expensesReport = useMemo(() => getExpensesReport(startDate, endDate), [startDate, endDate, tick]);
  const allExpenses = useMemo(() => getAllExpenses(), [tick]); // Para arqueo, traemos todo y filtramos hoy localmente
  const cashCuts = useMemo(() => getAllCuts(), [tick]);

  // --- CÁLCULOS DEL TABLERO ---
  const cashFlowBalance = financialReport.totalIncome - expensesReport.totalExpense;

  // --- CÁLCULOS ESTADO DE RESULTADOS (P&L) ---
  const pnl = useMemo(() => {
      const totalSales = profitabilityReport.global.sales;
      const costOfGoodsSold = profitabilityReport.global.cost;
      const grossProfit = profitabilityReport.global.profit;
      
      const cats = expensesReport.byCategory || {};
      const payrollExpenses = cats.NOMINA || 0;
      const inventoryPurchases = cats.INVENTARIO || 0;
      
      // Gastos Operativos (Todo menos Nómina, Inventario y CostoVenta directo)
      // CostoVenta ya suele estar en costOfGoodsSold si viene de WO pagadas.
      // Para no duplicar, restamos COSTO_VENTA del total de gastos operativos si queremos ser estrictos,
      // o lo asumimos como parte del COGS financiero.
      // Aquí sumaremos el resto como OpEx.
      
      const operatingExpenses = (expensesReport.totalExpense) - payrollExpenses - inventoryPurchases - (cats.COSTO_VENTA || 0);
      const ebitda = grossProfit - operatingExpenses - payrollExpenses;

      return { totalSales, costOfGoodsSold, grossProfit, operatingExpenses, payrollExpenses, inventoryPurchases, ebitda };
  }, [profitabilityReport, expensesReport]);


  // --- CÁLCULOS PARA CORTE DE CAJA (SIEMPRE ES DE "HOY") ---
  const todayStr = getTodayStr();
  const expensesTodayByMethod = useMemo(() => {
      return allExpenses.reduce((acc, e) => {
          if (e.date.slice(0, 10) === todayStr) {
              const m = e.method || "EFECTIVO";
              acc[m] = (acc[m] || 0) + e.amount;
          }
          return acc;
      }, { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, CHEQUE: 0 });
  }, [allExpenses, todayStr]);

  // Nota: Para el corte usamos getFinancialReport SIN filtros (o filtrado a HOY) para obtener lo real del sistema
  const reportToday = useMemo(() => getFinancialReport(todayStr, todayStr), [todayStr, tick]);
  
  const expectedCash = (reportToday.incomeByMethod?.EFECTIVO || 0) - expensesTodayByMethod.EFECTIVO;
  const expectedCard = (reportToday.incomeByMethod?.TARJETA || 0); 
  const expectedTransfer = (reportToday.incomeByMethod?.TRANSFERENCIA || 0) - expensesTodayByMethod.TRANSFERENCIA;

  // --- MODAL DE CORTE ---
  const CashCutModal = ({ onClose }) => {
      const [declared, setDeclared] = useState({ cash: "", card: "", transfer: "" });
      const [notes, setNotes] = useState("");
      
      const diffCash = (Number(declared.cash) || 0) - expectedCash;
      const diffCard = (Number(declared.card) || 0) - expectedCard;
      const diffTransfer = (Number(declared.transfer) || 0) - expectedTransfer;
      const totalDiff = diffCash + diffCard + diffTransfer;
      const isPerfect = Math.abs(totalDiff) < 1;

      const handleSave = () => {
          createCut({
              details: {
                  cash: { expected: expectedCash, declared: declared.cash },
                  card: { expected: expectedCard, declared: declared.card },
                  transfer: { expected: expectedTransfer, declared: declared.transfer }
              },
              notes
          });
          setTick(t => t + 1);
          onClose();
          alert("Corte guardado.");
      };

      const MethodRow = ({ label, icon, expected, fieldKey, diff }) => (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, alignItems: "center", marginBottom: 10, paddingBottom:10, borderBottom:"1px solid #333" }}>
              <div><div style={{fontWeight:"bold", color:"#ddd"}}>{icon} {label}</div><div style={{fontSize:11, color:"#888"}}>Sistema: ${expected.toLocaleString()}</div></div>
              <div><input type="number" placeholder="Real..." value={declared[fieldKey]} onChange={e => setDeclared({...declared, [fieldKey]: e.target.value})} style={{ width: "100%", padding: 8, background: "#222", border: "1px solid #555", color: "white", borderRadius: 4 }} /></div>
              <div style={{textAlign:"right", fontSize:12, fontWeight:"bold", color: Math.abs(diff) < 1 ? "#4ade80" : "#f87171"}}>{diff > 0 ? "+" : ""}{diff.toLocaleString()}</div>
          </div>
      );

      return (
        <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
            <div style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333", width: 500 }}>
                <h3 style={{ marginTop: 0, color: "#e5e7eb" }}>Cierre de Día ({todayStr})</h3>
                <div style={{ marginBottom: 20 }}>
                    <MethodRow label="Efectivo" icon="💵" expected={expectedCash} fieldKey="cash" diff={diffCash} />
                    <MethodRow label="Terminales" icon="💳" expected={expectedCard} fieldKey="card" diff={diffCard} />
                    <MethodRow label="Bancos" icon="🏦" expected={expectedTransfer} fieldKey="transfer" diff={diffTransfer} />
                </div>
                <div style={{ marginBottom: 20, textAlign: "center", color: totalDiff === 0 ? "#4ade80" : "#f87171", fontWeight: "bold" }}>DIFERENCIA TOTAL: {totalDiff > 0 ? "+" : ""}{totalDiff.toLocaleString()}</div>
                <textarea placeholder="Notas..." value={notes} onChange={e => setNotes(e.target.value)} style={{ width: "100%", padding: 10, background: "#222", border: "1px solid #444", color: "white", borderRadius: 6, marginBottom: 20 }} rows={2} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><button onClick={onClose} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button><button onClick={handleSave} style={{ background: "#2563eb", color: "white", padding: "10px 20px", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}>Guardar</button></div>
            </div>
        </div>
      );
  };

  const StatCard = ({ label, value, color = "white", subtext, isCurrency = true }) => (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 12, padding: 20, display:"flex", flexDirection:"column", justifyContent:"center" }}>
      <div style={{ color: "#888", fontSize: "0.85em", marginBottom: 5, textTransform: "uppercase", letterSpacing:"0.5px" }}>{label}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: color }}>{isCurrency ? `$${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : value}</div>
      {subtext && <div style={{ fontSize: "0.8em", color: "#666", marginTop: 5 }}>{subtext}</div>}
    </div>
  );

  const PnLRow = ({ label, amount, type="neutral", bold=false, indent=false }) => {
      const color = type === "positive" ? "#4ade80" : type === "negative" ? "#f87171" : "#ddd";
      return (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #222", fontSize: "0.95em" }}>
              <div style={{ paddingLeft: indent ? 20 : 0, color: bold ? "white" : "#aaa", fontWeight: bold ? "bold" : "normal" }}>{label}</div>
              <div style={{ color: color, fontWeight: bold ? "bold" : "normal" }}>{type==="negative" && "-"}${amount.toLocaleString()}</div>
          </div>
      );
  };

  return (
    <div style={{ paddingBottom: 40, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Finanzas</h1>
        <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowCutModal(true)} style={{ background: "#333", border: "1px solid #aaa", color: "white", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>✂️ Cierre de Día</button>
            <button onClick={() => setTick(t => t + 1)} style={{ background: "#2563eb", border: "none", color: "white", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>🔄</button>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div style={{ background: "#111", padding: 15, borderRadius: 10, border: "1px solid #333", marginBottom: 30, display: "flex", gap: 15, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{color:"#aaa", fontSize:14, fontWeight:"bold"}}>📅 Periodo:</span>
          
          <div style={{display:"flex", gap:5}}>
              {["DAY", "WEEK", "MONTH", "YEAR"].map(t => (
                  <button key={t} onClick={() => { setFilterType(t); setFilterValue(t==='DAY' || t==='WEEK' ? getTodayStr() : t==='MONTH' ? getMonthStr() : new Date().getFullYear()); }} 
                    style={{ padding: "6px 12px", borderRadius: 6, border: filterType === t ? "1px solid #60a5fa" : "1px solid #444", background: filterType === t ? "#1e3a8a" : "transparent", color: filterType === t ? "white" : "#888", cursor: "pointer" }}>
                      {t === 'DAY' ? 'Día' : t === 'WEEK' ? 'Semana' : t === 'MONTH' ? 'Mes' : 'Año'}
                  </button>
              ))}
          </div>

          <div style={{borderLeft:"1px solid #444", paddingLeft:15}}>
              {filterType === "DAY" && <input type="date" value={filterValue} onChange={e => setFilterValue(e.target.value)} style={{padding:6, borderRadius:4, background:"#222", color:"white", border:"1px solid #555"}} />}
              {filterType === "WEEK" && <input type="date" value={filterValue} onChange={e => setFilterValue(e.target.value)} style={{padding:6, borderRadius:4, background:"#222", color:"white", border:"1px solid #555"}} title="Selecciona un día de la semana" />}
              {filterType === "MONTH" && <input type="month" value={filterValue} onChange={e => setFilterValue(e.target.value)} style={{padding:6, borderRadius:4, background:"#222", color:"white", border:"1px solid #555"}} />}
              {filterType === "YEAR" && (
                  <select value={filterValue} onChange={e => setFilterValue(e.target.value)} style={{padding:6, borderRadius:4, background:"#222", color:"white", border:"1px solid #555"}}>
                      {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
              )}
          </div>
          
          <div style={{marginLeft:"auto", fontSize:13, color:"#60a5fa", fontWeight:"bold"}}>{label}</div>
      </div>

      {showCutModal && <CashCutModal onClose={() => setShowCutModal(false)} />}

      {/* METRICAS PRINCIPALES */}
      <h3 style={{ color: "#4ade80", borderBottom: "1px solid #333", paddingBottom: 10 }}>💰 Flujo de Caja ({label})</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginBottom: 20 }}>
        <StatCard label="Ingresos (Cobrado)" value={financialReport.totalIncome} color="#4ade80" subtext="Entradas reales de dinero" />
        <StatCard label="Egresos (Pagado)" value={expensesReport.totalExpense} color="#f87171" subtext="Salidas reales de dinero" />
        <StatCard label="Flujo Neto" value={cashFlowBalance} color={cashFlowBalance >= 0 ? "#60a5fa" : "#f87171"} subtext="Remanente del periodo" />
        <StatCard label="Ventas Generadas" value={financialReport.totalSales} color="#fff" subtext="Facturación total (incluye crédito)" />
      </div>

      {/* LINKS ACCESOS */}
      <div style={{ display: "flex", gap: 15, marginBottom: 40, flexWrap:"wrap" }}>
          <Link to="/payables" style={{ flex: 1, textDecoration: "none", minWidth: 200 }}><div style={{ background: "#450a0a", border: "1px solid #f87171", borderRadius: 8, padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fca5a5" }}><span style={{ fontWeight: "bold" }}>📉 Cuentas por Pagar</span><span>Ver Deudas →</span></div></Link>
          <Link to="/receivables" style={{ flex: 1, textDecoration: "none", minWidth: 200 }}><div style={{ background: "#064e3b", border: "1px solid #4ade80", borderRadius: 8, padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#86efac" }}><span style={{ fontWeight: "bold" }}>📈 Cuentas por Cobrar</span><span>Ver Créditos →</span></div></Link>
          <Link to="/payroll" style={{ flex: 1, textDecoration: "none", minWidth: 200 }}><div style={{ background: "#172554", border: "1px solid #60a5fa", borderRadius: 8, padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#bfdbfe" }}><span style={{ fontWeight: "bold" }}>👥 Nómina y Comisiones</span><span>Calcular Pago →</span></div></Link>
      </div>

      {/* P&L Y RENTABILIDAD */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 30 }}>
          <div style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#fbbf24" }}>📊 Estado de Resultados</h3>
              <PnLRow label=" (+) Ventas Totales" amount={pnl.totalSales} bold type="neutral" />
              <PnLRow label=" (-) Costo de Ventas" amount={pnl.costOfGoodsSold} type="negative" indent />
              <div style={{ height: 10 }}></div>
              <PnLRow label=" (=) UTILIDAD BRUTA" amount={pnl.grossProfit} bold type="positive" />
              <div style={{ height: 10 }}></div>
              <PnLRow label=" (-) Gastos Operativos" amount={pnl.operatingExpenses} type="negative" indent />
              <PnLRow label=" (-) Nómina" amount={pnl.payrollExpenses} type="negative" indent />
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
          {cashCuts.slice(0, 5).map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: 15, background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, alignItems:"center" }}>
                  <div>
                      <div style={{fontWeight:"bold", color:"white"}}>{new Date(c.date).toLocaleString()}</div>
                      <div style={{fontSize:"0.85em", color:"#888"}}>Dif Total: {c.totalDifference > 0 ? "+" : ""}{c.totalDifference?.toLocaleString()}</div>
                  </div>
                  <div style={{fontSize:"0.8em", color:"#666"}}>{c.notes}</div>
              </div>
          ))}
      </div>
    </div>
  );
}