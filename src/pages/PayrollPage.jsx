import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { calculatePayrollReport } from "@/services/payrollService";
import { createExpense } from "@/services/expensesStorage";

const PERIODS = [
    { id: 'MONTH', label: 'Mes Completo' },
    { id: 'Q1', label: '1ra Quincena (1-15)' },
    { id: 'Q2', label: '2da Quincena (16-Fin)' }
];

export default function PayrollPage() {
  const [tick, setTick] = useState(0);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [period, setPeriod] = useState("MONTH"); // 👈 NUEVO ESTADO

  // Pasamos el periodo al servicio
  const report = useMemo(() => calculatePayrollReport(year, month, period), [year, month, period, tick]);

  const totalCommissions = report.reduce((sum, r) => sum + r.commissionAmount, 0);
  const totalBase = report.reduce((sum, r) => sum + r.baseSalary, 0);
  const grandTotal = totalCommissions + totalBase;

  const handlePay = (empReport) => {
      if (empReport.totalToPay <= 0) return alert("Monto 0, nada que pagar.");
      
      const periodLabel = PERIODS.find(p => p.id === period)?.label || period;
      
      const confirmMsg = `¿Registrar pago a ${empReport.name}?\n\nPeriodo: ${periodLabel}\nSueldo Base: $${empReport.baseSalary.toLocaleString()}\nComisiones: $${empReport.commissionAmount.toLocaleString()}\nTOTAL A PAGAR: $${empReport.totalToPay.toLocaleString()}`;
      
      if (!confirm(confirmMsg)) return;

      createExpense({
          description: `Nómina ${periodLabel} ${month}/${year}: ${empReport.name}`,
          amount: empReport.totalToPay,
          category: "NOMINA",
          method: "TRANSFERENCIA",
          date: new Date().toISOString()
      });

      alert("Pago registrado en Gastos.");
      setTick(t => t + 1);
  };

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <div style={{ marginBottom: 20 }}>
        <Link to="/finance" style={{ color: "#888", textDecoration: "none", fontSize: "0.9em" }}>← Volver a Finanzas</Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
           <h1 style={{ margin: 0 }}>Nómina y Comisiones</h1>
           
           <div style={{display:"flex", gap:10}}>
               <select value={period} onChange={e => setPeriod(e.target.value)} style={{padding:8, borderRadius:6, background:"#1e3a8a", color:"white", border:"1px solid #60a5fa", fontWeight:"bold"}}>
                   {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
               </select>
               <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{padding:8, borderRadius:6, background:"#333", color:"white", border:"1px solid #555"}}>
                   {Array.from({length:12}, (_, i) => i+1).map(m => <option key={m} value={m}>Mes {m}</option>)}
               </select>
               <select value={year} onChange={e => setYear(Number(e.target.value))} style={{padding:8, borderRadius:6, background:"#333", color:"white", border:"1px solid #555"}}>
                   {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
               </select>
           </div>
        </div>
      </div>

      {/* RESUMEN */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 30 }}>
          <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
              <div style={{ fontSize: 12, color: "#aaa" }}>SUELDOS BASE ({period === 'MONTH' ? 'MENSUAL' : 'QUINCENAL'})</div>
              <div style={{ fontSize: "1.8em", fontWeight: "bold", color: "#4ade80" }}>${totalBase.toLocaleString()}</div>
          </div>
          <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
              <div style={{ fontSize: 12, color: "#aaa" }}>COMISIONES DE VENTAS</div>
              <div style={{ fontSize: "1.8em", fontWeight: "bold", color: "#fbbf24" }}>${totalCommissions.toLocaleString()}</div>
          </div>
          <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #60a5fa" }}>
              <div style={{ fontSize: 12, color: "#60a5fa" }}>TOTAL A DISPERSAR</div>
              <div style={{ fontSize: "1.8em", fontWeight: "bold", color: "white" }}>${grandTotal.toLocaleString()}</div>
          </div>
      </div>

      {/* TABLA DE EMPLEADOS */}
      <div style={{ display: "grid", gap: 10 }}>
          {report.map(row => (
              <div key={row.id} style={{ background: "#111", border: "1px solid #333", borderRadius: 10, padding: 15, display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr auto", alignItems: "center", gap: 15 }}>
                  <div>
                      <div style={{fontWeight:"bold", fontSize:"1.1em"}}>{row.name}</div>
                      <div style={{fontSize:"0.8em", color:"#888"}}>{row.salesCount} ventas ({row.commissionPercent}%)</div>
                  </div>
                  
                  <div style={{textAlign:"right"}}>
                      <div style={{fontSize:"0.8em", color:"#aaa"}}>Base {period==='MONTH'?'Mensual':'Quincenal'}</div>
                      <div style={{color:"#4ade80"}}>${row.baseSalary.toLocaleString()}</div>
                  </div>

                  <div style={{textAlign:"right"}}>
                      <div style={{fontSize:"0.8em", color:"#aaa"}}>Comisiones</div>
                      <div style={{color:"#fbbf24"}}>${row.commissionAmount.toLocaleString()}</div>
                  </div>

                  <div style={{textAlign:"right"}}>
                      <div style={{fontSize:"0.8em", color:"#aaa"}}>Total a Pagar</div>
                      <div style={{fontWeight:"bold", color:"white", fontSize:"1.1em"}}>${row.totalToPay.toLocaleString()}</div>
                  </div>

                  <button 
                    onClick={() => handlePay(row)} 
                    disabled={row.totalToPay <= 0}
                    style={{ background: row.totalToPay > 0 ? "#16a34a" : "#333", color: row.totalToPay > 0 ? "white" : "#666", padding: "8px 16px", border: "none", borderRadius: 6, cursor: row.totalToPay > 0 ? "pointer" : "not-allowed", fontWeight: "bold" }}
                  >
                      Pagar
                  </button>
              </div>
          ))}
          {report.length === 0 && <p style={{opacity:0.5, textAlign:"center"}}>No hay empleados registrados.</p>}
      </div>
      
      <p style={{marginTop:30, fontSize:12, color:"#666", textAlign:"center"}}>
          * Nota: Al seleccionar quincena, el sueldo mensual se divide automáticamente entre 2.
      </p>
    </div>
  );
}