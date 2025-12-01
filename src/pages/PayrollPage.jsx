// ... imports igual
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { calculatePayrollReport } from "@/services/payrollService";
import { createExpense } from "@/services/expensesStorage";

export default function PayrollPage() {
  const [tick, setTick] = useState(0);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const report = useMemo(() => calculatePayrollReport(year, month), [year, month, tick]);

  const totalPayroll = report.reduce((sum, r) => sum + r.totalToPay, 0);

  const handlePay = (empReport) => {
      if (empReport.totalToPay <= 0) return alert("Monto 0, nada que pagar.");
      
      const confirmMsg = `¿Registrar pago a ${empReport.name}?\n\nSueldo: $${empReport.baseSalary}\nComisión: $${empReport.commissionAmount}\nTOTAL: $${empReport.totalToPay}`;
      if (!confirm(confirmMsg)) return;

      createExpense({
          description: `Nómina ${month}/${year}: ${empReport.name}`,
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
               <select value={year} onChange={e => setYear(Number(e.target.value))} style={{padding:8, borderRadius:6, background:"#333", color:"white", border:"1px solid #555"}}>
                   {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
               </select>
               <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{padding:8, borderRadius:6, background:"#333", color:"white", border:"1px solid #555"}}>
                   {Array.from({length:12}, (_, i) => i+1).map(m => <option key={m} value={m}>Mes {m}</option>)}
               </select>
           </div>
        </div>
      </div>

      <div style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #fbbf24", marginBottom: 30, textAlign:"center" }}>
          <div style={{ fontSize: 12, color: "#fbbf24", textTransform:"uppercase" }}>Total a Pagar (Nómina + Comisiones)</div>
          <div style={{ fontSize: "2.5em", fontWeight: "bold", color: "white" }}>${totalPayroll.toLocaleString()}</div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
          {report.map(row => (
              <div key={row.id} style={{ background: "#111", border: "1px solid #333", borderRadius: 10, padding: 15, display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr auto", alignItems: "center", gap: 15 }}>
                  <div>
                      <div style={{fontWeight:"bold", fontSize:"1.1em"}}>{row.name}</div>
                      <div style={{fontSize:"0.8em", color:"#888"}}>{row.salesCount} ventas ({row.commissionPercent}%)</div>
                  </div>
                  
                  <div style={{textAlign:"right"}}>
                      <div style={{fontSize:"0.8em", color:"#aaa"}}>Sueldo Base</div>
                      <div style={{color:"#4ade80"}}>${row.baseSalary.toLocaleString()}</div>
                  </div>

                  <div style={{textAlign:"right"}}>
                      <div style={{fontSize:"0.8em", color:"#aaa"}}>Comisiones</div>
                      <div style={{color:"#fbbf24"}}>${row.commissionAmount.toLocaleString()}</div>
                  </div>

                  <div style={{textAlign:"right"}}>
                      <div style={{fontSize:"0.8em", color:"#aaa"}}>Total</div>
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
    </div>
  );
}