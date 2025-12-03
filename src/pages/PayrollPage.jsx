import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { calculatePayrollReport } from "@/services/payrollService";
import { createExpense } from "@/services/expensesStorage";
import LoadingState from "@/components/LoadingState";

const PERIODS = [{ id: 'MONTH', label: 'Mes Completo' }, { id: 'Q1', label: '1ra Quincena' }, { id: 'Q2', label: '2da Quincena' }];

export default function PayrollPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState([]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [period, setPeriod] = useState("MONTH");

  useEffect(() => {
      async function load() {
          setLoading(true);
          try {
              const data = await calculatePayrollReport(year, month, period);
              setReport(data);
          } catch(e) { console.error(e); } finally { setLoading(false); }
      }
      load();
  }, [year, month, period]);

  const handlePay = async (empReport) => {
      if (!confirm(`¿Registrar pago a ${empReport.name}?`)) return;
      await createExpense({
          description: `Nómina ${month}/${year}: ${empReport.name}`,
          amount: empReport.totalToPay,
          category: "NOMINA",
          method: "TRANSFERENCIA",
          date: new Date().toISOString()
      });
      alert("Pago registrado.");
  };

  if (loading) return <LoadingState />;

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      <h1>Nómina y Comisiones</h1>
      {/* ... (Selectores de fecha y periodo igual que antes) ... */}
      <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          {report.map(row => (
              <div key={row.id} style={{ background: "#111", padding: 15, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems:"center" }}>
                  <div><div style={{fontWeight:"bold"}}>{row.name}</div><div>Ventas: ${row.totalSales.toLocaleString()}</div></div>
                  <div style={{textAlign:"right"}}><div style={{color:"#4ade80"}}>${row.totalToPay.toLocaleString()}</div><button onClick={() => handlePay(row)}>Pagar</button></div>
              </div>
          ))}
      </div>
    </div>
  );
}