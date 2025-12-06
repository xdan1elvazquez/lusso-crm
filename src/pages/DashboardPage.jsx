import { useEffect, useState } from "react";
import { getPatients } from "@/services/patientsStorage";
import { getAllConsultations } from "@/services/consultationsStorage";
import { getAllSales } from "@/services/salesStorage";
import { getAllWorkOrders } from "@/services/workOrdersStorage";
import LoadingState from "@/components/LoadingState";
// 👇 UI Kit
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

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

            const sortedConsultations = [...consultations].sort(
              (a, b) => new Date(b.visitDate || b.createdAt).getTime() - new Date(a.visitDate || a.createdAt).getTime()
            );

            const pendingSales = sales
              .map((s) => {
                const paidAmount = s.paidAmount ?? (Array.isArray(s.payments) ? s.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) : 0);
                const balance = s.balance ?? Math.max((Number(s.total) || 0) - paidAmount, 0);
                return { ...s, paidAmount, balance };
              })
              .filter((s) => s.balance > 0.01)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
    <div className="page-container">
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Pacientes" value={stats.totalPatients} />
        <StatCard label="Consultas" value={stats.totalConsultations} />
        <StatCard label="Ventas Pendientes" value={stats.pendingSalesCount} />
        <StatCard label="Por Cobrar" value={formatCurrency(stats.pendingSalesBalance)} color="text-red-400" border="border-red-500/30" />
        <StatCard
          label="Trabajos Activos"
          value={
            (stats.workOrdersByStatus.TO_PREPARE || 0) +
            (stats.workOrdersByStatus.SENT_TO_LAB || 0) +
            (stats.workOrdersByStatus.READY || 0)
          }
          color="text-amber-400"
          border="border-amber-500/30"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* CONSULTAS RECIENTES */}
          <section>
            <h2 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
               🩺 Últimas Consultas
            </h2>
            {stats.lastConsultations.length === 0 ? (
              <p className="text-gray-500 italic">Sin actividad reciente.</p>
            ) : (
              <div className="space-y-3">
                {stats.lastConsultations.map((c) => (
                    <Card key={c.id} className="flex justify-between items-center py-3 px-4" noPadding>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">{new Date(c.visitDate).toLocaleDateString()}</div>
                        <div className="font-semibold text-white">{c.reason || "Revisión General"}</div>
                      </div>
                      <Badge color={c.type === "OPHTHALMO" ? "blue" : "green"}>
                        {c.type === "OPHTHALMO" ? "Médica" : "Optometría"}
                      </Badge>
                    </Card>
                ))}
              </div>
            )}
          </section>

          {/* COBRANZA */}
          <section>
            <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
               💳 Cobranza Pendiente
            </h2>
            {stats.lastPendingSales.length === 0 ? (
              <p className="text-gray-500 italic">Todo al corriente.</p>
            ) : (
              <div className="space-y-3">
                {stats.lastPendingSales.map((s) => (
                    <Card key={s.id} className="flex justify-between items-center py-3 px-4" noPadding>
                      <div>
                          <div className="text-xs text-gray-500 mb-1">{new Date(s.createdAt).toLocaleDateString()}</div>
                          <div className="font-semibold text-white">{s.patientName || "Cliente Mostrador"}</div>
                      </div>
                      <div className="text-right">
                          <div className="text-red-400 font-bold">{formatCurrency(s.balance)}</div>
                          <div className="text-xs text-gray-600">Debe</div>
                      </div>
                    </Card>
                ))}
              </div>
            )}
          </section>
      </div>

      {/* ESTADO DEL TALLER */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Estado del Taller</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Metric label="Por Preparar" value={stats.workOrdersByStatus.TO_PREPARE} color="text-amber-400" />
          <Metric label="En Lab" value={stats.workOrdersByStatus.SENT_TO_LAB} color="text-blue-400" />
          <Metric label="Calidad" value={stats.workOrdersByStatus.QUALITY_CHECK} color="text-purple-400" />
          <Metric label="Listos" value={stats.workOrdersByStatus.READY} color="text-emerald-400" />
          <Metric label="Entregados" value={stats.workOrdersByStatus.DELIVERED} color="text-gray-500" />
        </div>
      </section>
    </div>
  );
}

// Componentes internos (reemplazados por versiones con Tailwind limpio)
function StatCard({ label, value, color = "text-white", border = "border-[#333]" }) {
  return (
    <div className={`bg-[#1a1a1a] border ${border} rounded-xl p-4 flex flex-col justify-between h-24`}>
      <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{value || 0}</span>
    </div>
  );
}

function Metric({ label, value, color = "text-white" }) {
  return (
    <div className="bg-[#111] rounded-lg p-3 text-center border border-[#222]">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value || 0}</div>
    </div>
  );
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}