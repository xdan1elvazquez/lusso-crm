import React, { useState, useEffect } from "react";
import { getFinancialReport } from "@/services/salesStorage";
import { getLedgerStats } from "@/services/ledgerStorage";
import { getGlobalAuditLogs } from "@/services/auditStorage";
import { roundMoney } from "@/utils/currency";
import LoadingState from "@/components/LoadingState";
import { useAuth } from "@/context/AuthContext";

// UI Components del sistema
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

// 🟢 IMPORTAMOS EL GESTOR DE TERMINALES (NUEVO)
import TerminalsManager from "@/components/settings/TerminalsManager";

// Iconos simples
const ICONS = {
  money: "💰",
  chart: "📊",
  list: "📝",
  warn: "⚠️",
  check: "✅",
  in: "↗️",
  out: "↘️",
  card: "💳" // 🟢 Nuevo icono para el botón
};

export default function FinancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("DASHBOARD"); // DASHBOARD, LEDGER, AUDIT
  
  // 🟢 ESTADO PARA EL MODAL DE COMISIONES
  const [showTerminalsModal, setShowTerminalsModal] = useState(false);

  // Por defecto: Mes actual para ver datos si existen
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const currentDay = today.toISOString().slice(0, 10);

  const [dateRange, setDateRange] = useState({
    start: firstDay,
    end: currentDay
  });

  const [kpis, setKpis] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    loadData();
  }, [dateRange, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const branchId = user?.branchId || "lusso_main";
      
      // 1. Reporte Histórico (Ventas viejas y nuevas)
      const salesReport = await getFinancialReport(dateRange.start, dateRange.end, branchId);
      setKpis(salesReport);

      // 2. Reporte Ledger (Solo lo nuevo auditable)
      const ledgerStats = await getLedgerStats(dateRange.start, dateRange.end);
      setLedgerData(ledgerStats);

      // 3. Auditoría
      const logs = await getGlobalAuditLogs(50);
      setAuditLogs(logs);

    } catch (error) {
      console.error("Error cargando finanzas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  if (loading) return <LoadingState />;

  return (
    <div className="page-container space-y-6 animate-fadeIn">
      
      {/* HEADER & FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Finanzas</h1>
          <p className="text-textMuted text-sm">
            Auditoría y control de flujo de efectivo ({user?.branchId === 'lusso_main' ? 'Matriz' : 'Sucursal'})
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          
          {/* 🟢 BOTÓN NUEVO: COMISIONES TPV */}
          <Button variant="secondary" onClick={() => setShowTerminalsModal(true)} className="flex items-center gap-2 mr-2">
              <span className="text-lg">{ICONS.card}</span> Comisiones TPV
          </Button>

          <div className="flex gap-2 items-center bg-surface border border-border p-1.5 rounded-xl shadow-sm">
            <input 
                type="date" 
                name="start" 
                value={dateRange.start} 
                onChange={handleDateChange}
                className="bg-surfaceHighlight text-white border-transparent rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <span className="text-textMuted text-xs">a</span>
            <input 
                type="date" 
                name="end" 
                value={dateRange.end} 
                onChange={handleDateChange}
                className="bg-surfaceHighlight text-white border-transparent rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <Button onClick={loadData} size="sm" variant="primary">
                Refrescar
            </Button>
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex gap-4 border-b border-border pb-1">
        <TabButton 
            active={activeTab === "DASHBOARD"} 
            onClick={() => setActiveTab("DASHBOARD")}
            label="Resumen & KPIs"
            icon={ICONS.chart}
        />
        <TabButton 
            active={activeTab === "LEDGER"} 
            onClick={() => setActiveTab("LEDGER")}
            label="Libro Mayor (Caja Real)"
            icon={ICONS.money}
        />
        <TabButton 
            active={activeTab === "AUDIT"} 
            onClick={() => setActiveTab("AUDIT")}
            label="Logs de Auditoría"
            icon={ICONS.list}
        />
      </div>

      {/* --- VISTA: DASHBOARD --- */}
      {activeTab === "DASHBOARD" && kpis && ledgerData && (
        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Ventas Generadas" 
                    value={`$${kpis.totalSales}`} 
                    subtext="Total de tickets (Ventas)"
                    color="text-blue-400"
                    borderColor="border-blue-500/20"
                />
                <StatCard 
                    title="Ingreso Neto (Caja)" 
                    value={`$${ledgerData.totalNet}`} 
                    subtext="Entradas - Salidas (Ledger)"
                    color="text-emerald-400"
                    borderColor="border-emerald-500/20"
                />
                <StatCard 
                    title="Por Cobrar" 
                    value={`$${kpis.totalReceivable}`} 
                    subtext="Saldo pendiente en la calle"
                    color="text-amber-400"
                    borderColor="border-amber-500/20"
                />
                <StatCard 
                    title="Devoluciones" 
                    value={`$${ledgerData.totalOut}`} 
                    subtext="Dinero devuelto (Ledger)"
                    color="text-red-400"
                    borderColor="border-red-500/20"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* MIX DE PAGOS */}
                <Card className="flex flex-col h-full" noPadding>
                    <div className="p-5 border-b border-border bg-surfaceHighlight/30">
                        <h3 className="font-bold text-white flex items-center gap-2">
                           {ICONS.money} Flujo por Método de Pago
                        </h3>
                        <p className="text-xs text-textMuted mt-1">Basado en movimientos reales del Ledger</p>
                    </div>
                    <div className="p-6 space-y-4 flex-1">
                        {Object.entries(ledgerData.byMethod).map(([method, amount]) => (
                            <ProgressBar 
                                key={method} 
                                label={method} 
                                value={amount} 
                                max={ledgerData.totalIn} 
                                color="bg-indigo-500" 
                            />
                        ))}
                        {Object.keys(ledgerData.byMethod).length === 0 && (
                             <EmptyState text="No hay movimientos registrados en este periodo." />
                        )}
                    </div>
                </Card>

                {/* EFECTIVIDAD DE COBRANZA */}
                <Card className="flex flex-col h-full" noPadding>
                    <div className="p-5 border-b border-border bg-surfaceHighlight/30">
                        <h3 className="font-bold text-white flex items-center gap-2">
                           {ICONS.check} Efectividad de Cobranza
                        </h3>
                         <p className="text-xs text-textMuted mt-1">Ventas vs. Recaudación real</p>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            <RowDetail label="Ventas Totales" value={`$${kpis.totalSales}`} />
                            <RowDetail label="Pagado" value={`$${kpis.totalIncome}`} color="text-emerald-400" />
                            <RowDetail label="Pendiente (Crédito)" value={`$${kpis.totalReceivable}`} color="text-red-400" />
                            
                            <div className="mt-6 pt-4 border-t border-border">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-bold text-white">% Recuperación</span>
                                    <span className="text-2xl font-bold text-white">
                                        {kpis.totalSales > 0 
                                            ? Math.round((kpis.totalIncome / kpis.totalSales) * 100) 
                                            : 0}%
                                    </span>
                                </div>
                                <div className="w-full bg-surfaceHighlight rounded-full h-3">
                                    <div 
                                        className="bg-gradient-to-r from-blue-500 to-emerald-400 h-3 rounded-full" 
                                        style={{ width: `${kpis.totalSales > 0 ? (kpis.totalIncome / kpis.totalSales) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
      )}

      {/* --- VISTA: LEDGER --- */}
      {activeTab === "LEDGER" && ledgerData && (
        <Card noPadding className="animate-[fadeIn_0.3s_ease-out]">
             <div className="p-5 border-b border-border bg-surfaceHighlight/30 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-white">Libro Mayor (Ledger)</h3>
                    <p className="text-xs text-textMuted">Registro inmutable de entradas y salidas.</p>
                </div>
                <Badge color="blue">Auditado</Badge>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-textMuted uppercase bg-surfaceHighlight/50 text-xs font-semibold">
                        <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Ref / Venta</th>
                            <th className="px-6 py-4">Método</th>
                            <th className="px-6 py-4 text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {ledgerData.movements.map((mov) => (
                            <tr key={mov.id} className="hover:bg-surfaceHighlight/50 transition-colors">
                                <td className="px-6 py-4 text-textMain whitespace-nowrap">
                                    <div className="font-medium">{new Date(mov.timestamp).toLocaleDateString()}</div>
                                    <div className="text-xs text-textMuted">{new Date(mov.timestamp).toLocaleTimeString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <Badge color={mov.amount < 0 ? 'red' : 'green'}>{mov.type}</Badge>
                                </td>
                                <td className="px-6 py-4 text-textMain">
                                    {mov.reference || <span className="font-mono text-xs">{mov.saleId?.slice(0,8)}</span>}
                                    <div className="text-xs text-textMuted">{mov.user}</div>
                                </td>
                                <td className="px-6 py-4 text-textMain">{mov.method}</td>
                                <td className={`px-6 py-4 text-right font-mono font-bold text-lg ${
                                     mov.amount < 0 ? 'text-red-400' : 'text-emerald-400'
                                }`}>
                                    {mov.amount < 0 ? '-' : '+'}${Math.abs(mov.amount)}
                                </td>
                            </tr>
                        ))}
                        {ledgerData.movements.length === 0 && (
                            <tr><td colSpan="5" className="p-10 text-center text-textMuted italic">No hay movimientos en este periodo.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
      )}

      {/* --- VISTA: AUDITORÍA --- */}
      {activeTab === "AUDIT" && (
        <Card noPadding className="animate-[fadeIn_0.3s_ease-out]">
             <div className="p-5 border-b border-border bg-surfaceHighlight/30">
                <h3 className="font-bold text-white">Log de Actividad del Sistema</h3>
                <p className="text-xs text-textMuted">Últimos 50 eventos registrados.</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-textMuted uppercase bg-surfaceHighlight/50 text-xs font-semibold">
                        <tr>
                            <th className="px-6 py-4">Hora</th>
                            <th className="px-6 py-4">Acción</th>
                            <th className="px-6 py-4">Entidad</th>
                            <th className="px-6 py-4">Usuario</th>
                            <th className="px-6 py-4">Detalle</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-surfaceHighlight/50 transition-colors">
                                <td className="px-6 py-4 text-textMuted whitespace-nowrap">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                    <div className="text-xs opacity-50">{new Date(log.timestamp).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4 font-bold text-primary">{log.action}</td>
                                <td className="px-6 py-4">
                                    <span className="font-mono text-xs bg-surfaceHighlight px-2 py-1 rounded text-textMain">
                                        {log.entityType}: {log.entityId?.slice(0,6)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-textMain">{log.user}</td>
                                <td className="px-6 py-4 text-textMain max-w-xs">
                                    <div className="truncate" title={log.reason}>{log.reason}</div>
                                    {log.previousState && (
                                        <details className="mt-1">
                                            <summary className="text-xs text-primary cursor-pointer hover:underline">Ver previo</summary>
                                            <pre className="text-[10px] bg-black/30 p-2 rounded mt-1 overflow-x-auto text-textMuted">
                                                {log.previousState}
                                            </pre>
                                        </details>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {auditLogs.length === 0 && (
                            <tr><td colSpan="5" className="p-10 text-center text-textMuted italic">No hay logs recientes.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
      )}

      {/* 🟢 MODAL CORREGIDO: Usamos TerminalsManager directo, sin doble ModalWrapper */}
      {showTerminalsModal && (
          <TerminalsManager onClose={() => setShowTerminalsModal(false)} />
      )}

    </div>
  );
}

// --- SUB-COMPONENTES VISUALES (PRESERVADOS) ---

function TabButton({ active, onClick, label, icon }) {
    return (
        <button 
            onClick={onClick}
            className={`px-4 py-3 text-sm font-medium flex items-center gap-2 transition-all border-b-2 ${
                active 
                ? "border-primary text-primary" 
                : "border-transparent text-textMuted hover:text-white hover:border-border"
            }`}
        >
            <span>{icon}</span> {label}
        </button>
    );
}

function StatCard({ title, value, subtext, color, borderColor }) {
    return (
        <Card className={`relative overflow-hidden border ${borderColor || 'border-border'}`}>
             <div className="relative z-10">
                <div className="text-xs font-bold text-textMuted uppercase tracking-wider mb-1">{title}</div>
                <div className={`text-3xl font-bold ${color} tracking-tight`}>{value}</div>
                <div className="text-xs text-textMuted mt-1">{subtext}</div>
            </div>
            {/* Efecto de fondo sutil */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-5 ${color.replace('text-', 'bg-')}`}></div>
        </Card>
    );
}

function ProgressBar({ label, value, max, color }) {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between text-sm mb-1.5">
                <span className="text-textMain font-medium">{label}</span>
                <span className="text-white font-bold">${roundMoney(value)}</span>
            </div>
            <div className="w-full bg-surfaceHighlight rounded-full h-2">
                <div 
                    className={`h-2 rounded-full ${color}`} 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}

function RowDetail({ label, value, color = "text-white" }) {
    return (
        <div className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
            <span className="text-textMuted text-sm">{label}</span>
            <span className={`font-mono font-medium ${color}`}>{value}</span>
        </div>
    );
}

function EmptyState({ text }) {
    return (
        <div className="flex flex-col items-center justify-center h-32 text-textMuted bg-surfaceHighlight/20 rounded-xl border border-dashed border-border">
            <span className="text-2xl mb-2 opacity-50">📂</span>
            <span className="text-sm italic">{text}</span>
        </div>
    );
}