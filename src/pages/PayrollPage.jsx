import { useState, useEffect } from "react";
import { calculatePayrollReport } from "@/services/payrollService";
import { createExpense } from "@/services/expensesStorage";
import LoadingState from "@/components/LoadingState";

// UI Kit
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";

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
    <div className="page-container space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Nómina y Comisiones</h1>
            <p className="text-textMuted text-sm">Cálculo de pagos basado en ventas</p>
          </div>
          
          <div className="flex gap-2 bg-surface p-2 rounded-xl border border-border">
              <Select value={year} onChange={e => setYear(Number(e.target.value))} className="!w-24 !py-1">
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
              <Select value={month} onChange={e => setMonth(Number(e.target.value))} className="!w-32 !py-1">
                  {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>Mes {m}</option>)}
              </Select>
              <Select value={period} onChange={e => setPeriod(e.target.value)} className="!w-40 !py-1">
                  {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </Select>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.map(row => (
              <Card key={row.id} noPadding className="group hover:border-blue-500/30 transition-colors">
                  <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <div className="font-bold text-white text-lg">{row.name}</div>
                              <Badge color="gray">{row.role}</Badge>
                          </div>
                          <div className="text-right">
                              <div className="text-xs text-textMuted uppercase mb-1">Total a Pagar</div>
                              <div className="text-2xl font-bold text-emerald-400">${row.totalToPay.toLocaleString()}</div>
                          </div>
                      </div>
                      
                      <div className="space-y-2 text-sm bg-surfaceHighlight/30 p-3 rounded-lg border border-border mb-4">
                          <div className="flex justify-between">
                              <span className="text-textMuted">Sueldo Base</span>
                              <span className="text-white font-mono">${row.baseSalary.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-textMuted">Comisión ({row.commissionPercent}%)</span>
                              <span className="text-white font-mono">${row.commissionAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-border/50 text-xs text-textMuted">
                              <span>Ventas Totales</span>
                              <span>${row.totalSales.toLocaleString()} ({row.salesCount} ops)</span>
                          </div>
                      </div>

                      <Button onClick={() => handlePay(row)} className="w-full" variant="secondary">
                          Registrar Pago
                      </Button>
                  </div>
              </Card>
          ))}
          {report.length === 0 && <div className="col-span-full py-20 text-center text-textMuted italic">No hay colaboradores activos.</div>}
      </div>
    </div>
  );
}