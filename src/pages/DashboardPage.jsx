import { useEffect, useState } from "react";
import { getPatients } from "@/services/patientsStorage";
import { getAllConsultations } from "@/services/consultationsStorage";
import { getAllSales } from "@/services/salesStorage";
import { getAllWorkOrders } from "@/services/workOrdersStorage";
import LoadingState from "@/components/LoadingState";

// 👇 IMPORTANTE: El panel de reparación que agregamos
import FinanceRepairPanel from "@/components/admin/FinanceRepairPanel";

// 👇 UI Kit Nuevo
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button"; 

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalConsultations: 0,
    lastConsultations: [],
    pendingSalesCount: 0,
    pendingSalesBalance: 0,
    lastPendingSales: [],
    workOrdersByStatus: {},
  });

  useEffect(() => {
    async function loadDashboard() {
        setLoading(true);
        try {
            const [patients, consultations, sales, workOrders] = await Promise.all([
                getPatients(), getAllConsultations(), getAllSales(), getAllWorkOrders()
            ]);

            // Ordenar consultas recientes
            const sortedConsultations = [...consultations].sort(
              (a, b) => new Date(b.visitDate || b.createdAt).getTime() - new Date(a.visitDate || a.createdAt).getTime()
            );

            // Calcular ventas pendientes
            const pendingSales = sales
              .map((s) => {
                const paidAmount = s.paidAmount ?? (Array.isArray(s.payments) ? s.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) : 0);
                const balance = s.balance ?? Math.max((Number(s.total) || 0) - paidAmount, 0);
                return { ...s, paidAmount, balance };
              })
              .filter((s) => s.balance > 0.01) // Solo deudores
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            // Agrupar órdenes por estado
            const workOrdersByStatus = workOrders.reduce((acc, w) => {
              const key = w.status || "UNKNOWN";
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {});

            setStats({
              totalPatients: patients.length,
              totalConsultations: consultations.length,
              lastConsultations: sortedConsultations.slice(0, 5),
              pendingSalesCount: pendingSales.length,
              pendingSalesBalance: pendingSales.reduce((acc, s) => acc + (Number(s.balance) || 0), 0),
              lastPendingSales: pendingSales.slice(0, 5),
              workOrdersByStatus,
            });

        } catch (error) {
            console.error("Error cargando dashboard:", error);
        } finally {
            setLoading(false);
        }
    }
    loadDashboard();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="page-container space-y-8">
      
      {/* 🔧 PANEL DE REPARACIÓN (Solo visible aquí para mantenimiento) */}
      <FinanceRepairPanel />

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-textMuted text-sm">Resumen general de la clínica</p>
      </div>

      {/* KPI CARDS - GRID PRINCIPAL */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <KpiCard icon="👥" label="Pacientes" value={stats.totalPatients} />
        <KpiCard icon="🩺" label="Consultas" value={stats.totalConsultations} />
        <KpiCard icon="🛒" label="Ventas Pendientes" value={stats.pendingSalesCount} />
        <KpiCard 
            icon="💳" 
            label="Por Cobrar" 
            value={formatCurrency(stats.pendingSalesBalance)} 
            highlightColor="text-red-400"
            borderColor="border-red-500/20"
        />
        <KpiCard
          icon="👓"
          label="Trabajos Activos"
          value={
            (stats.workOrdersByStatus.TO_PREPARE || 0) +
            (stats.workOrdersByStatus.SENT_TO_LAB || 0) +
            (stats.workOrdersByStatus.READY || 0)
          }
          highlightColor="text-amber-400"
          borderColor="border-amber-500/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CONSULTAS RECIENTES */}
          <Card className="h-full flex flex-col" noPadding>
            <div className="p-5 border-b border-border bg-surfaceHighlight/30 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">🩺 Últimas Consultas</h3>
                <span className="text-xs text-textMuted uppercase tracking-wider font-bold">Reciente</span>
            </div>
            <div className="p-4 space-y-3 flex-1">
                {stats.lastConsultations.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-textMuted italic">Sin actividad reciente.</div>
                ) : (
                  stats.lastConsultations.map((c) => (
                      <div key={c.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-surfaceHighlight transition-colors border border-transparent hover:border-border">
                        <div>
                          <div className="text-xs text-textMuted font-medium mb-0.5">{new Date(c.visitDate).toLocaleDateString()}</div>
                          <div className="font-semibold text-textMain">{c.reason || "Revisión General"}</div>
                        </div>
                        <Badge color={c.type === "OPHTHALMO" ? "blue" : "green"}>
                          {c.type === "OPHTHALMO" ? "Médica" : "Optometría"}
                        </Badge>
                      </div>
                  ))
                )}
            </div>
          </Card>

          {/* COBRANZA */}
          <Card className="h-full flex flex-col" noPadding>
            <div className="p-5 border-b border-border bg-surfaceHighlight/30 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">💳 Cobranza Pendiente</h3>
                <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 font-bold">Deudores</span>
            </div>
            <div className="p-4 space-y-3 flex-1">
                {stats.lastPendingSales.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-emerald-400 italic">Todo al corriente.</div>
                ) : (
                  stats.lastPendingSales.map((s) => (
                      <div key={s.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-surfaceHighlight transition-colors border border-transparent hover:border-border">
                        <div>
                            <div className="text-xs text-textMuted font-medium mb-0.5">{new Date(s.createdAt).toLocaleDateString()}</div>
                            <div className="font-semibold text-textMain">{s.patientName || "Cliente Mostrador"}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-red-400 font-bold tracking-tight">{formatCurrency(s.balance)}</div>
                            <div className="text-[10px] text-textMuted uppercase font-bold">Restante</div>
                        </div>
                      </div>
                  ))
                )}
            </div>
          </Card>
      </div>

      {/* ESTADO DEL TALLER (Banner) */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">🏭 Estado del Taller</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <WorkshopMetric label="Por Preparar" value={stats.workOrdersByStatus.TO_PREPARE} color="text-amber-400" border="border-amber-500/30" />
          <WorkshopMetric label="En Lab" value={stats.workOrdersByStatus.SENT_TO_LAB} color="text-blue-400" border="border-blue-500/30" />
          <WorkshopMetric label="Calidad" value={stats.workOrdersByStatus.QUALITY_CHECK} color="text-purple-400" border="border-purple-500/30" />
          <WorkshopMetric label="Listos" value={stats.workOrdersByStatus.READY} color="text-emerald-400" border="border-emerald-500/30" />
          <WorkshopMetric label="Entregados" value={stats.workOrdersByStatus.DELIVERED} color="text-textMuted" border="border-border" />
        </div>
      </section>
    </div>
  );
}

// --- Componentes Internos Modernizados ---

function KpiCard({ icon, label, value, highlightColor = "text-white", borderColor }) {
  return (
    <Card className={`flex flex-col justify-between h-28 relative overflow-hidden group ${borderColor ? `border ${borderColor}` : ""}`}>
      {/* Efecto de fondo sutil */}
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 text-6xl select-none pointer-events-none grayscale">
        {icon}
      </div>
      <div className="text-xs font-bold text-textMuted uppercase tracking-wider z-10">{label}</div>
      <div className={`text-3xl font-bold ${highlightColor} z-10 tracking-tight`}>{value || 0}</div>
    </Card>
  );
}

function WorkshopMetric({ label, value, color, border }) {
  return (
    <div className={`bg-surface border ${border} rounded-xl p-4 text-center hover:bg-surfaceHighlight transition-colors`}>
      <div className={`text-2xl font-bold ${color} mb-1`}>{value || 0}</div>
      <div className="text-xs text-textMuted font-medium uppercase">{label}</div>
    </div>
  );
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}