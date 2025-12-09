import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext"; // 👈 1. Importar Auth
import { getFinancialReport, getProfitabilityReport } from "@/services/salesStorage";
import { getExpensesReport } from "@/services/expensesStorage";
import { getAllShifts } from "@/services/shiftsStorage"; 
import LoadingState from "@/components/LoadingState";
import TerminalsManager from "@/components/settings/TerminalsManager";

// UI Kit
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

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
  const { user } = useAuth(); // 👈 2. Obtener usuario y branchId
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("MONTH");
  const [filterValue, setFilterValue] = useState(getMonthStr());

  const [showTerminals, setShowTerminals] = useState(false);
  
  const [financialReport, setFinancial] = useState({ totalIncome: 0, totalSales: 0 });
  const [profitabilityReport, setProfitability] = useState({ global: {sales:0, cost:0, profit:0}, byCategory: {} });
  const [expensesReport, setExpenses] = useState({ totalExpense: 0 });
  const [cuts, setCuts] = useState([]); 

  const startDate = filterType === 'MONTH' ? getMonthRange(filterValue).start : filterValue;
  const endDate = filterType === 'MONTH' ? getMonthRange(filterValue).end : filterValue;
  
  const dateLabel = filterType === 'MONTH' 
    ? new Date(filterValue + "-01").toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    : new Date(filterValue).toLocaleDateString('es-MX', { dateStyle: 'full' });

  useEffect(() => {
      // Seguridad: esperar a que cargue el usuario
      if (!user?.branchId) return;

      async function loadFinance() {
          setLoading(true);
          try {
              // 👈 3. Pasar branchId a TODOS los reportes para segregar datos
              const [fin, prof, exp, allShifts] = await Promise.all([
                  getFinancialReport(startDate, endDate, user.branchId),
                  getProfitabilityReport(startDate, endDate, user.branchId),
                  getExpensesReport(startDate, endDate, user.branchId),
                  getAllShifts(user.branchId)
              ]);
              setFinancial(fin);
              setProfitability(prof);
              setExpenses(exp);
              setCuts(allShifts.filter(s => s.status === "CLOSED"));
          } catch(e) { console.error(e); } finally { setLoading(false); }
      }
      loadFinance();
  }, [filterValue, filterType, user]); // Recargar si cambia el usuario

  const cashFlowBalance = (Number(financialReport.totalIncome) || 0) - (Number(expensesReport.totalExpense) || 0);
  
  const globalStats = profitabilityReport.global || {};
  const totalSalesVal = Number(globalStats.sales) || 0;
  const totalCostVal = Number(globalStats.cost) || 0;
  const grossProfitVal = Number(globalStats.profit) || 0;
  const operatingExpensesVal = Number(expensesReport.totalExpense) || 0;

  const pnl = {
      totalSales: totalSalesVal,
      costOfGoodsSold: totalCostVal,
      grossProfit: grossProfitVal,
      operatingExpenses: operatingExpensesVal,
      ebitda: grossProfitVal - operatingExpensesVal
  };

  if (loading) return <LoadingState />;

  return (
    <div className="page-container space-y-8 animate-fadeIn">
      {/* HEADER Y FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Finanzas</h1>
            <p className="text-textMuted text-sm capitalize">
                {dateLabel} • <strong className="text-emerald-400">{user.branchId === 'lusso_main' ? 'Matriz' : 'Sucursal'}</strong>
            </p>
        </div>
        
        <div className="flex items-center gap-2 bg-surface p-1.5 rounded-xl border border-border">

            <Button variant="secondary" onClick={() => setShowTerminals(true)} className="text-xs h-9 mr-2 border-dashed border-primary/40 text-primary hover:text-white hover:bg-primary/20">
               ⚙️ Terminales
            </Button>

            <div className="flex bg-background rounded-lg p-1">
                <button 
                    onClick={() => { setFilterType("DAY"); setFilterValue(getTodayStr()); }} 
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${filterType==="DAY" ? "bg-blue-600 text-white shadow" : "text-textMuted hover:text-white"}`}
                >
                    Día
                </button>
                <button 
                    onClick={() => { setFilterType("MONTH"); setFilterValue(getMonthStr()); }} 
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${filterType==="MONTH" ? "bg-blue-600 text-white shadow" : "text-textMuted hover:text-white"}`}
                >
                    Mes
                </button>
            </div>
            <input 
                type={filterType === "MONTH" ? "month" : "date"} 
                value={filterValue} 
                onChange={e => setFilterValue(e.target.value)} 
                className="bg-transparent border-none text-white text-sm focus:ring-0 outline-none px-2" 
            />
            <button onClick={() => setFilterValue(filterType==='MONTH'?getMonthStr():getTodayStr())} className="p-2 hover:bg-white/10 rounded-lg text-textMuted transition-colors" title="Hoy / Este Mes">
                🔄
            </button>
        </div>
      </div>

      {/* KPI CARDS (FLUJO DE CAJA) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Ingresos (Cobrado)" value={financialReport.totalIncome} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-500/5" icon="fw-bold" />
        <StatCard label="Egresos (Pagado)" value={expensesReport.totalExpense} color="text-red-400" border="border-red-500/20" bg="bg-red-500/5" />
        <StatCard label="Flujo Neto" value={cashFlowBalance} color={cashFlowBalance >= 0 ? "text-blue-400" : "text-amber-400"} border={cashFlowBalance >= 0 ? "border-blue-500/20" : "border-amber-500/20"} bg={cashFlowBalance >= 0 ? "bg-blue-500/5" : "bg-amber-500/5"} />
        <StatCard label="Ventas Generadas" value={financialReport.totalSales} color="text-white" border="border-border" bg="bg-surface" />
      </div>

      {/* ACCESOS RÁPIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/payables" className="group">
              <div className="h-full bg-surface border border-border hover:border-red-500/50 rounded-xl p-4 flex justify-between items-center transition-all hover:translate-y-[-2px] shadow-sm">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center text-red-400 text-lg">📉</div>
                      <div>
                          <div className="font-bold text-white text-sm">Cuentas por Pagar</div>
                          <div className="text-xs text-textMuted">Proveedores y Labs</div>
                      </div>
                  </div>
                  <span className="text-xs text-red-400 font-medium group-hover:underline">Ver Deudas →</span>
              </div>
          </Link>

          <Link to="/receivables" className="group">
              <div className="h-full bg-surface border border-border hover:border-emerald-500/50 rounded-xl p-4 flex justify-between items-center transition-all hover:translate-y-[-2px] shadow-sm">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400 text-lg">📈</div>
                      <div>
                          <div className="font-bold text-white text-sm">Cuentas por Cobrar</div>
                          <div className="text-xs text-textMuted">Créditos a Clientes</div>
                      </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium group-hover:underline">Ver Créditos →</span>
              </div>
          </Link>

          <Link to="/payroll" className="group">
              <div className="h-full bg-surface border border-border hover:border-blue-500/50 rounded-xl p-4 flex justify-between items-center transition-all hover:translate-y-[-2px] shadow-sm">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400 text-lg">👥</div>
                      <div>
                          <div className="font-bold text-white text-sm">Nómina</div>
                          <div className="text-xs text-textMuted">Comisiones y Pagos</div>
                      </div>
                  </div>
                  <span className="text-xs text-blue-400 font-medium group-hover:underline">Calcular Pago →</span>
              </div>
          </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* ESTADO DE RESULTADOS (PNL) */}
          <Card className="lg:col-span-2 border-t-4 border-t-amber-500">
              <div className="flex items-center gap-2 mb-6">
                  <span className="text-xl">📊</span>
                  <h3 className="text-lg font-bold text-amber-400">Estado de Resultados</h3>
              </div>
              <div className="space-y-1">
                  <PnLRow label="(+) Ventas Totales" amount={pnl.totalSales} />
                  <PnLRow label="(-) Costo de Ventas" amount={pnl.costOfGoodsSold} type="negative" />
                  
                  <div className="my-3 border-t border-border"></div>
                  <PnLRow label="(=) UTILIDAD BRUTA" amount={pnl.grossProfit} type="positive" bold size="lg" />
                  <div className="my-3 border-t border-border"></div>
                  
                  <PnLRow label="(-) Gastos Operativos" amount={pnl.operatingExpenses} type="negative" />
                  
                  <div className="my-4 border-t-2 border-dashed border-border"></div>
                  <div className="flex justify-between items-center py-2 bg-surfaceHighlight/20 -mx-6 px-6">
                      <span className="font-bold text-white text-lg">(=) EBITDA</span>
                      <span className={`font-bold text-xl ${pnl.ebitda >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        ${pnl.ebitda.toLocaleString()}
                      </span>
                  </div>
              </div>
          </Card>

          {/* RENTABILIDAD POR CATEGORÍA */}
          <Card className="lg:col-span-3 border-t-4 border-t-purple-500" noPadding>
              <div className="p-5 border-b border-border bg-surfaceHighlight/20 flex items-center gap-2">
                  <span className="text-xl">📈</span>
                  <h3 className="text-lg font-bold text-purple-400">Rentabilidad por Área</h3>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                      <thead className="bg-surfaceHighlight text-textMuted uppercase text-xs">
                          <tr>
                              <th className="p-4 text-left">Área</th>
                              <th className="p-4 text-right">Venta</th>
                              <th className="p-4 text-right">Margen</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                          {Object.entries(profitabilityReport.byCategory).map(([key, data]) => {
                              const sales = Number(data.sales) || 0;
                              const profit = Number(data.profit) || 0;
                              const marginPercent = sales > 0 ? (profit / sales) * 100 : 0;
                              return (
                                  <tr key={key} className="hover:bg-white/5 transition-colors">
                                      <td className="p-4 font-medium text-white">{CATEGORY_LABELS[key] || key}</td>
                                      <td className="p-4 text-right text-textMuted">${sales.toLocaleString()}</td>
                                      <td className="p-4 text-right">
                                          <div className={`font-bold ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                              ${profit.toLocaleString()}
                                          </div>
                                          <div className="text-xs text-textMuted opacity-70">
                                              {marginPercent.toFixed(1)}%
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })}
                          {Object.keys(profitabilityReport.byCategory).length === 0 && (
                             <tr><td colSpan={3} className="p-8 text-center text-textMuted italic">Sin datos en este periodo.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </Card>
      </div>
      
      {/* HISTORIAL CIERRES */}
      <div className="mt-8">
          <h3 className="text-xs font-bold text-textMuted uppercase tracking-widest mb-4 flex items-center gap-2">
              <span>🗄️</span> Últimos Cierres de Caja
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cuts.slice(0, 6).map(c => (
                  <div key={c.id} className="bg-surface border border-border rounded-xl p-4 flex justify-between items-center opacity-80 hover:opacity-100 hover:border-primary/30 transition-all cursor-default">
                      <div>
                          <div className="font-bold text-white text-sm">{new Date(c.closedAt || c.openedAt).toLocaleDateString()}</div>
                          <div className="text-xs text-textMuted mt-0.5">{c.user}</div>
                      </div>
                      <div className="text-xs text-textMuted bg-background px-2 py-1 rounded border border-border max-w-[150px] truncate">
                         {c.notes || "Sin notas"}
                      </div>
                  </div>
              ))}
              {cuts.length === 0 && <p className="text-textMuted text-sm italic">No hay cierres registrados.</p>}
          </div>
      </div>
      
      {showTerminals && <TerminalsManager onClose={() => setShowTerminals(false)} />}
    </div>
  );
}

// Sub-componentes Visuales
const StatCard = ({ label, value, color, border, bg }) => (
    <div className={`rounded-xl p-6 border ${border} ${bg}`}>
      <div className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-bold tracking-tight ${color}`}>
        ${(value||0).toLocaleString()}
      </div>
    </div>
);

const PnLRow = ({ label, amount, type="neutral", bold=false, size="base" }) => {
    const color = type === "positive" ? "text-emerald-400" : type === "negative" ? "text-red-400" : "text-white";
    const textSize = size === "lg" ? "text-lg" : "text-sm";
    
    return (
        <div className="flex justify-between py-1.5 items-center">
            <span className={`${textSize} ${bold ? "font-bold text-white" : "text-textMuted"}`}>{label}</span>
            <span className={`${textSize} ${bold ? "font-bold" : ""} ${color}`}>
                {type==="negative" && "-"}${Math.abs(Number(amount||0)).toLocaleString()}
            </span>
        </div>
    );
};