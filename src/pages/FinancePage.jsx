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

export default function FinancePage() {
  const [tick, setTick] = useState(0);
  const [showCutModal, setShowCutModal] = useState(false);
  
  // Hooks de datos
  const financialReport = useMemo(() => getFinancialReport(), [tick]);
  const profitabilityReport = useMemo(() => getProfitabilityReport(), [tick]);
  const expensesReport = useMemo(() => getExpensesReport(), [tick]);
  const allExpenses = useMemo(() => getAllExpenses(), [tick]);
  const cashCuts = useMemo(() => getAllCuts(), [tick]);

  // --- CÁLCULOS DEL TABLERO (NIVEL 1 & 2) ---
  const cashFlowBalance = financialReport.incomeMonth - expensesReport.monthTotal;
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = new Date().toISOString().slice(0, 7);
  
  // Cálculo gastos hoy por método
  const expensesTodayByMethod = useMemo(() => {
      return allExpenses.reduce((acc, e) => {
          if (e.date.slice(0, 10) === todayStr) {
              const m = e.method || "EFECTIVO";
              acc[m] = (acc[m] || 0) + e.amount;
          }
          return acc;
      }, { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, CHEQUE: 0 });
  }, [allExpenses, todayStr]);

  const expectedCash = (financialReport.incomeByMethod?.EFECTIVO || 0) - expensesTodayByMethod.EFECTIVO;
  const expectedCard = (financialReport.incomeByMethod?.TARJETA || 0); 
  const expectedTransfer = (financialReport.incomeByMethod?.TRANSFERENCIA || 0) - expensesTodayByMethod.TRANSFERENCIA;

  // --- CÁLCULOS ESTADO DE RESULTADOS (P&L - NIVEL 3) ---
  const pnl = useMemo(() => {
      // 1. Ventas Totales (Devengado - Lo que se vendió, se haya cobrado o no)
      const totalSales = profitabilityReport.global.sales;

      // 2. Costo de Ventas (Lo que costó esa mercancía + Labs directos)
      // Nota: Aquí usamos el costo calculado en profitabilityReport que ya suma (item.cost + workOrder.labCost)
      const costOfGoodsSold = profitabilityReport.global.cost;

      // 3. Utilidad Bruta
      const grossProfit = profitabilityReport.global.profit;

      // 4. Clasificación de Gastos del Mes (OpEx)
      // Filtramos los gastos que NO son Costo de Venta (para no duplicar)
      // Categorías que son COSTO DIRECTO: "COSTO_VENTA", "INVENTARIO" (Depende criterio, aquí los separamos para ver OpEx puro)
      // Si decidimos que "INVENTARIO" es inversión, no lo restamos de la utilidad operativa, solo del flujo de caja.
      // Pero para un P&L conservador, vamos a desglosar todo.
      
      let operatingExpenses = 0;
      let payrollExpenses = 0;
      let inventoryPurchases = 0; // Compras de stock (no necesariamente lo vendido)

      allExpenses.forEach(e => {
          if (e.date.slice(0, 7) !== monthStr) return; // Solo mes actual
          
          if (e.category === "NOMINA") {
              payrollExpenses += e.amount;
          } else if (e.category === "INVENTARIO") {
              inventoryPurchases += e.amount;
          } else if (e.category === "COSTO_VENTA") {
              // Ignoramos COSTO_VENTA aquí porque ya lo tenemos exacto en costOfGoodsSold (desde las WorkOrders/Items)
              // Esto evita duplicar si pagaste un lab (Gasto) y también lo restaste de la utilidad (Profitability).
              // PERO: Si profitabilityReport solo trae lo vendido, y tú pagaste algo extra... 
              // Para P&L exacto: Usamos costOfGoodsSold como la verdad del costo.
          } else {
              // Renta, Luz, Marketing, Mantenimiento, Otros...
              operatingExpenses += e.amount;
          }
      });

      // EBITDA (Utilidad de Operación) = Bruta - Gastos Fijos - Nómina
      const ebitda = grossProfit - operatingExpenses - payrollExpenses;

      return { totalSales, costOfGoodsSold, grossProfit, operatingExpenses, payrollExpenses, inventoryPurchases, ebitda };
  }, [profitabilityReport, allExpenses, monthStr]);


  // --- MODAL DE CORTE COMPLETO ---
  const CashCutModal = ({ onClose }) => {
      const [declared, setDeclared] = useState({ cash: "", card: "", transfer: "" });
      const [notes, setNotes] = useState("");
      
      const diffCash = (Number(declared.cash) || 0) - expectedCash;
      const diffCard = (Number(declared.card) || 0) - expectedCard;
      const diffTransfer = (Number(declared.transfer) || 0) - expectedTransfer;
      const totalDiff = diffCash + diffCard + diffTransfer;
      const isPerfect = Math.abs(totalDiff) < 1 && Math.abs(diffCash) < 1;

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
          alert("Corte guardado correctamente");
      };

      const MethodRow = ({ label, icon, expected, fieldKey, diff }) => (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, alignItems: "center", marginBottom: 10, paddingBottom:10, borderBottom:"1px solid #333" }}>
              <div>
                  <div style={{fontWeight:"bold", color:"#ddd"}}>{icon} {label}</div>
                  <div style={{fontSize:11, color:"#888"}}>Sistema: ${expected.toLocaleString()}</div>
              </div>
              <div>
                  <input type="number" placeholder="Real..." value={declared[fieldKey]} onChange={e => setDeclared({...declared, [fieldKey]: e.target.value})} style={{ width: "100%", padding: 8, background: "#222", border: "1px solid #555", color: "white", borderRadius: 4 }} />
              </div>
              <div style={{textAlign:"right", fontSize:12, fontWeight:"bold", color: Math.abs(diff) < 1 ? "#4ade80" : "#f87171"}}>
                  {diff > 0 ? "+" : ""}{diff.toLocaleString()}
              </div>
          </div>
      );

      return (
        <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
            <div style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333", width: 500, maxHeight:"90vh", overflowY:"auto" }}>
                <h3 style={{ marginTop: 0, color: "#e5e7eb" }}>Cierre de Día (Arqueo Global)</h3>
                <div style={{ marginBottom: 20 }}>
                    <MethodRow label="Efectivo" icon="💵" expected={expectedCash} fieldKey="cash" diff={diffCash} />
                    <MethodRow label="Terminales" icon="💳" expected={expectedCard} fieldKey="card" diff={diffCard} />
                    <MethodRow label="Bancos" icon="🏦" expected={expectedTransfer} fieldKey="transfer" diff={diffTransfer} />
                </div>
                <div style={{ marginBottom: 20, textAlign: "center", color: totalDiff === 0 ? "#4ade80" : "#f87171", fontWeight: "bold" }}>
                    DIFERENCIA TOTAL: {totalDiff > 0 ? "+" : ""}{totalDiff.toLocaleString()}
                </div>
                <textarea placeholder="Notas..." value={notes} onChange={e => setNotes(e.target.value)} style={{ width: "100%", padding: 10, background: "#222", border: "1px solid #444", color: "white", borderRadius: 6, marginBottom: 20 }} rows={2} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button onClick={onClose} style={{ background: "transparent", color: "#aaa", border: "none", cursor: "pointer" }}>Cancelar</button>
                    <button onClick={handleSave} style={{ background: "#2563eb", color: "white", padding: "10px 20px", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}>Guardar</button>
                </div>
            </div>
        </div>
      );
  };

  const StatCard = ({ label, value, color = "white", subtext, isCurrency = true }) => (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 12, padding: 20, display:"flex", flexDirection:"column", justifyContent:"center" }}>
      <div style={{ color: "#888", fontSize: "0.85em", marginBottom: 5, textTransform: "uppercase", letterSpacing:"0.5px" }}>{label}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: color }}>
          {isCurrency ? `$${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : value}
      </div>
      {subtext && <div style={{ fontSize: "0.8em", color: "#666", marginTop: 5 }}>{subtext}</div>}
    </div>
  );

  // Fila para tabla P&L
  const PnLRow = ({ label, amount, type="neutral", bold=false, indent=false }) => {
      const color = type === "positive" ? "#4ade80" : type === "negative" ? "#f87171" : "#ddd";
      return (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #222", fontSize: "0.95em" }}>
              <div style={{ paddingLeft: indent ? 20 : 0, color: bold ? "white" : "#aaa", fontWeight: bold ? "bold" : "normal" }}>{label}</div>
              <div style={{ color: color, fontWeight: bold ? "bold" : "normal" }}>
                  {type==="negative" && "-"}${amount.toLocaleString()}
              </div>
          </div>
      );
  };

  return (
    <div style={{ paddingBottom: 40, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div>
            <h1 style={{ margin: 0 }}>Finanzas & Resultados</h1>
            <p style={{margin:"5px 0 0 0", color:"#888", fontSize:"0.9em"}}>Reporte Mensual (Mes Actual)</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowCutModal(true)} style={{ background: "#333", border: "1px solid #aaa", color: "white", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>✂️ Cierre de Día</button>
            <button onClick={() => setTick(t => t + 1)} style={{ background: "#2563eb", border: "none", color: "white", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>🔄 Actualizar</button>
        </div>
      </div>

      {showCutModal && <CashCutModal onClose={() => setShowCutModal(false)} />}

      {/* SECCIÓN 1: METRICAS CLAVE (CASH FLOW) */}
      <h3 style={{ color: "#4ade80", borderBottom: "1px solid #333", paddingBottom: 10 }}>💰 Flujo de Caja (Liquidez)</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 20 }}>
        <StatCard label="Ingresos Cobrados" value={financialReport.incomeMonth} color="#4ade80" subtext="Dinero que entró a caja" />
        <StatCard label="Egresos Totales" value={expensesReport.monthTotal} color="#f87171" subtext="Salidas reales de dinero" />
        <StatCard label="Flujo Neto" value={cashFlowBalance} color={cashFlowBalance >= 0 ? "#60a5fa" : "#f87171"} subtext="Remanente efectivo del mes" />
      </div>

      {/* LINKS ACCESOS DIRECTOS */}
      <div style={{ display: "flex", gap: 15, marginBottom: 40, flexWrap:"wrap" }}>
          <Link to="/payables" style={{ flex: 1, textDecoration: "none", minWidth: 200 }}>
              <div style={{ background: "#450a0a", border: "1px solid #f87171", borderRadius: 8, padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fca5a5" }}>
                  <span style={{ fontWeight: "bold" }}>📉 Cuentas por Pagar</span>
                  <span>Ver Deudas →</span>
              </div>
          </Link>
          <Link to="/receivables" style={{ flex: 1, textDecoration: "none", minWidth: 200 }}>
              <div style={{ background: "#064e3b", border: "1px solid #4ade80", borderRadius: 8, padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#86efac" }}>
                  <span style={{ fontWeight: "bold" }}>📈 Cuentas por Cobrar</span>
                  <span>Ver Créditos →</span>
              </div>
          </Link>
          <Link to="/payroll" style={{ flex: 1, textDecoration: "none", minWidth: 200 }}>
              <div style={{ background: "#172554", border: "1px solid #60a5fa", borderRadius: 8, padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#bfdbfe" }}>
                  <span style={{ fontWeight: "bold" }}>👥 Nómina y Comisiones</span>
                  <span>Calcular Pago →</span>
              </div>
          </Link>
      </div>

      {/* SECCIÓN 2: ESTADO DE RESULTADOS INTEGRAL (P&L) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 30 }}>
          
          {/* TABLA P&L */}
          <div style={{ background: "#1a1a1a", padding: 25, borderRadius: 12, border: "1px solid #333" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#fbbf24" }}>📊 Estado de Resultados (P&L)</h3>
              
              <PnLRow label=" (+) Ventas Totales" amount={pnl.totalSales} bold type="neutral" />
              <PnLRow label=" (-) Costo de Ventas (Mercancía/Lab)" amount={pnl.costOfGoodsSold} type="negative" indent />
              
              <div style={{ height: 10 }}></div>
              <PnLRow label=" (=) UTILIDAD BRUTA" amount={pnl.grossProfit} bold type="positive" />
              <div style={{ height: 10 }}></div>

              <PnLRow label=" (-) Gastos Operativos (Fijos)" amount={pnl.operatingExpenses} type="negative" indent />
              <PnLRow label=" (-) Nómina y Comisiones" amount={pnl.payrollExpenses} type="negative" indent />
              
              <div style={{ height: 15, borderBottom: "1px dashed #444" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "15px 0", fontSize: "1.2em", fontWeight: "bold" }}>
                  <div style={{ color: "#fff" }}>(=) UTILIDAD DE OPERACIÓN</div>
                  <div style={{ color: pnl.ebitda >= 0 ? "#4ade80" : "#f87171" }}>${pnl.ebitda.toLocaleString()}</div>
              </div>
              
              {/* NOTA INFORMATIVA DE INVENTARIO */}
              {pnl.inventoryPurchases > 0 && (
                  <div style={{ marginTop: 20, padding: 10, background: "#222", borderRadius: 6, fontSize: "0.85em", color: "#888" }}>
                      ℹ️ Nota: Se invirtieron <strong>${pnl.inventoryPurchases.toLocaleString()}</strong> en stock este mes (ya restado en Flujo de Caja, pero no afecta la Utilidad Operativa hasta que se venda).
                  </div>
              )}
          </div>

          {/* TABLA DESGLOSE RENTABILIDAD */}
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

      {/* SECCIÓN 3: HISTORIAL CORTES */}
      <h3 style={{ color: "#aaa", borderBottom: "1px solid #333", paddingBottom: 10, marginTop: 40 }}>🗄️ Historial de Cierres de Caja</h3>
      <div style={{ display: "grid", gap: 10 }}>
          {cashCuts.slice(0, 5).map(c => {
              const totalDiff = c.totalDifference ?? c.difference;
              return (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: 15, background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, alignItems:"center" }}>
                    <div>
                        <div style={{fontWeight:"bold", color:"white"}}>{new Date(c.date).toLocaleString()}</div>
                        <div style={{fontSize:"0.85em", color:"#888", display:"flex", gap:10, marginTop:4}}>
                            <span>💵 Efvo: ${Number(c.details?.cash?.declared || 0).toLocaleString()}</span>
                            <span>💳 Term: ${Number(c.details?.card?.declared || 0).toLocaleString()}</span>
                        </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                        <div style={{fontWeight:"bold", color: totalDiff === 0 ? "#4ade80" : "#f87171"}}>
                            {totalDiff > 0 ? "+" : ""}{totalDiff.toLocaleString()}
                        </div>
                        <div style={{fontSize:"0.7em", color:"#666"}}>DIFERENCIA</div>
                    </div>
                </div>
              );
          })}
      </div>
    </div>
  );
}