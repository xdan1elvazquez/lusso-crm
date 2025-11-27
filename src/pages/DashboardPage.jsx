// src/pages/DashboardPage.jsx
import { useEffect, useState } from "react";
import { getPatients } from "../services/patientsStorage";
import {
  getAllConsultations,
} from "../services/consultationsStorage";
import { getAllSales } from "../services/salesStorage";
import { getAllWorkOrders } from "../services/workOrdersStorage";

export default function DashboardPage() {
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
    const patients = getPatients();
    const consultations = getAllConsultations() || [];
    const sales = getAllSales() || [];
    const workOrders = getAllWorkOrders() || [];

    // ordenar consultas de más reciente a más antigua
    const sorted = [...consultations].sort(
      (a, b) =>
        new Date(b.visitDate || b.createdAt || 0) -
        new Date(a.visitDate || a.createdAt || 0)
    );

    const pendingSales = sales
      .map((s) => {
        const paidAmount =
          s.paidAmount ??
          (Array.isArray(s.payments)
            ? s.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
            : 0);
        const balance = s.balance ?? Math.max((Number(s.total) || 0) - paidAmount, 0);
        return { ...s, paidAmount, balance };
      })
      .filter((s) => s.balance > 0)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const pendingBalanceSum = pendingSales.reduce((acc, s) => acc + (Number(s.balance) || 0), 0);

    const workOrdersByStatus = workOrders.reduce((acc, w) => {
      const key = w.status || "UNKNOWN";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    setStats({
      totalPatients: patients.length,
      totalConsultations: consultations.length,
      lastConsultations: sorted.slice(0, 5),
      pendingSalesCount: pendingSales.length,
      pendingSalesBalance: pendingBalanceSum,
      lastPendingSales: pendingSales.slice(0, 5),
      workOrdersByStatus,
    });
  }, []);

  return (
    <div style={{ color: "white" }}>
      <h1 style={{ fontSize: 32, marginBottom: 16 }}>Dashboard</h1>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <StatCard
          label="Pacientes registrados"
          value={stats.totalPatients}
        />
        <StatCard
          label="Consultas registradas"
          value={stats.totalConsultations}
        />
        <StatCard
          label="Ventas pendientes"
          value={stats.pendingSalesCount}
        />
        <StatCard
          label="Saldo por cobrar"
          value={formatCurrency(stats.pendingSalesBalance)}
        />
        <StatCard
          label="Work orders activos"
          value={
            (stats.workOrdersByStatus.TO_PREPARE || 0) +
            (stats.workOrdersByStatus.SENT_TO_LAB || 0) +
            (stats.workOrdersByStatus.READY || 0)
          }
        />
      </div>

      <section>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>
          Últimas consultas
        </h2>

        {stats.lastConsultations.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Todavía no hay consultas.</p>
        ) : (
          <ul style={{ display: "grid", gap: 8, padding: 0, listStyle: "none" }}>
            {stats.lastConsultations.map((c) => {
              const dateValue = c.visitDate || c.createdAt;
              const readableDate = dateValue
                ? new Date(dateValue).toLocaleString()
                : "Sin fecha";

              return (
                <li
                  key={c.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ fontSize: 14, opacity: 0.7 }}>{readableDate}</div>
                  <div style={{ fontWeight: 600 }}>{c.reason || "Sin motivo"}</div>
                  <div style={{ fontSize: 14, opacity: 0.8 }}>
                    Dx: {c.diagnosis || "Sin diagnóstico"}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>
          Últimas ventas pendientes
        </h2>

        {stats.lastPendingSales.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No hay ventas pendientes.</p>
        ) : (
          <ul style={{ display: "grid", gap: 8, padding: 0, listStyle: "none" }}>
            {stats.lastPendingSales.map((s) => {
              const created = s.createdAt ? new Date(s.createdAt).toLocaleString() : "Sin fecha";
              const balanceText = formatCurrency(s.balance);
              return (
                <li
                  key={s.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ fontSize: 14, opacity: 0.7 }}>{created}</div>
                  <div style={{ fontWeight: 600 }}>{s.description || "Venta"}</div>
                  <div style={{ fontSize: 14, opacity: 0.8 }}>
                    Saldo: {balanceText}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>
          Work orders por estado
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Metric label="Por preparar" value={stats.workOrdersByStatus.TO_PREPARE || 0} />
          <Metric label="Enviado a laboratorio" value={stats.workOrdersByStatus.SENT_TO_LAB || 0} />
          <Metric label="Listo para entregar" value={stats.workOrdersByStatus.READY || 0} />
          <Metric label="Entregado" value={stats.workOrdersByStatus.DELIVERED || 0} />
          <Metric label="Cancelado" value={stats.workOrdersByStatus.CANCELLED || 0} />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        minWidth: 180,
        padding: 16,
        borderRadius: 10,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return num.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });
}

function Metric({ label, value }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
