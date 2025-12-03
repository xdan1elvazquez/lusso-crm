import { useEffect, useState } from "react";
import { getPatients } from "@/services/patientsStorage";
import { getAllConsultations } from "@/services/consultationsStorage";
import { getAllSales } from "@/services/salesStorage";
import { getAllWorkOrders } from "@/services/workOrdersStorage";
import LoadingState from "@/components/LoadingState";

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
            // Carga paralela de todas las colecciones necesarias
            const [patients, consultations, sales, workOrders] = await Promise.all([
                getPatients(),
                getAllConsultations(),
                getAllSales(),
                getAllWorkOrders()
            ]);

            // 1. Procesar Consultas
            const sortedConsultations = [...consultations].sort(
              (a, b) => new Date(b.visitDate || b.createdAt).getTime() - new Date(a.visitDate || a.createdAt).getTime()
            );

            // 2. Procesar Ventas Pendientes
            const pendingSales = sales
              .map((s) => {
                const paidAmount = s.paidAmount ?? 
                  (Array.isArray(s.payments) ? s.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) : 0);
                const balance = s.balance ?? Math.max((Number(s.total) || 0) - paidAmount, 0);
                return { ...s, paidAmount, balance };
              })
              .filter((s) => s.balance > 0.01) // Filtro de saldos reales
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            const pendingBalanceSum = pendingSales.reduce((acc, s) => acc + (Number(s.balance) || 0), 0);

            // 3. Procesar Work Orders
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
              pendingSalesBalance: pendingBalanceSum,
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
    <div style={{ color: "white" }}>
      <h1 style={{ fontSize: 32, marginBottom: 16 }}>Dashboard</h1>

      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Pacientes registrados" value={stats.totalPatients} />
        <StatCard label="Consultas realizadas" value={stats.totalConsultations} />
        <StatCard label="Ventas con saldo pendiente" value={stats.pendingSalesCount} />
        <StatCard label="Monto por cobrar" value={formatCurrency(stats.pendingSalesBalance)} color="#f87171" />
        <StatCard
          label="Trabajos en proceso"
          value={
            (stats.workOrdersByStatus.TO_PREPARE || 0) +
            (stats.workOrdersByStatus.SENT_TO_LAB || 0) +
            (stats.workOrdersByStatus.READY || 0)
          }
          color="#fbbf24"
        />
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:30}}>
          <section>
            <h2 style={{ fontSize: 20, marginBottom: 12, color: "#60a5fa" }}>Últimas Consultas</h2>
            {stats.lastConsultations.length === 0 ? (
              <p style={{ opacity: 0.7 }}>Sin actividad reciente.</p>
            ) : (
              <ul style={{ display: "grid", gap: 8, padding: 0, listStyle: "none" }}>
                {stats.lastConsultations.map((c) => (
                    <li key={c.id} style={{ padding: 12, borderRadius: 8, background: "#1a1a1a", border: "1px solid #333" }}>
                      <div style={{ fontSize: 14, opacity: 0.7 }}>{new Date(c.visitDate).toLocaleDateString()}</div>
                      <div style={{ fontWeight: 600 }}>{c.reason || "Revisión General"}</div>
                      <div style={{ fontSize: 14, opacity: 0.8, color:"#a78bfa" }}>{c.diagnosis || "Sin diagnóstico"}</div>
                    </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 style={{ fontSize: 20, marginBottom: 12, color: "#f87171" }}>Cobranza Pendiente</h2>
            {stats.lastPendingSales.length === 0 ? (
              <p style={{ opacity: 0.7 }}>Todo al corriente.</p>
            ) : (
              <ul style={{ display: "grid", gap: 8, padding: 0, listStyle: "none" }}>
                {stats.lastPendingSales.map((s) => (
                    <li key={s.id} style={{ padding: 12, borderRadius: 8, background: "#1a1a1a", border: "1px solid #333" }}>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                          <span style={{ fontSize: 14, opacity: 0.7 }}>{new Date(s.createdAt).toLocaleDateString()}</span>
                          <span style={{color:"#f87171", fontWeight:"bold"}}>{formatCurrency(s.balance)}</span>
                      </div>
                      <div style={{ fontWeight: 600 }}>{s.description || "Venta"}</div>
                    </li>
                ))}
              </ul>
            )}
          </section>
      </div>

      <section style={{ marginTop: 24, padding: 20, background: "#1a1a1a", borderRadius: 12, border: "1px solid #333" }}>
        <h2 style={{ fontSize: 20, marginBottom: 12, marginTop: 0 }}>Estado del Taller</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15 }}>
          <Metric label="Por preparar" value={stats.workOrdersByStatus.TO_PREPARE || 0} color="#fbbf24" />
          <Metric label="En laboratorio" value={stats.workOrdersByStatus.SENT_TO_LAB || 0} color="#60a5fa" />
          <Metric label="Control Calidad" value={stats.workOrdersByStatus.QUALITY_CHECK || 0} color="#a78bfa" />
          <Metric label="Listos para entrega" value={stats.workOrdersByStatus.READY || 0} color="#4ade80" />
          <Metric label="Entregados (Histórico)" value={stats.workOrdersByStatus.DELIVERED || 0} color="#9ca3af" />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, color = "white" }) {
  return (
    <div style={{ minWidth: 180, padding: 16, borderRadius: 10, background: "#1a1a1a", border: "1px solid #333" }}>
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Metric({ label, value, color = "white" }) {
  return (
    <div style={{ textAlign: "center", padding: 10, background: "#111", borderRadius: 8 }}>
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 5 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: "1.5em", color }}>{value}</div>
    </div>
  );
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return num.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });
}