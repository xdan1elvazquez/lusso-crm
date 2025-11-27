// src/pages/DashboardPage.jsx
import { useEffect, useState } from "react";
import { getPatients } from "../services/patientsStorage";
import {
  getAllConsultations,
} from "../services/consultationsStorage";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalConsultations: 0,
    lastConsultations: [],
  });

  useEffect(() => {
    const patients = getPatients();
    const consultations = getAllConsultations();

    // ordenar consultas de más reciente a más antigua
    const sorted = [...consultations].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    setStats({
      totalPatients: patients.length,
      totalConsultations: consultations.length,
      lastConsultations: sorted.slice(0, 5),
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
      </div>

      <section>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>
          Últimas consultas
        </h2>

        {stats.lastConsultations.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Todavía no hay consultas.</p>
        ) : (
          <ul style={{ display: "grid", gap: 8, padding: 0, listStyle: "none" }}>
            {stats.lastConsultations.map((c) => (
              <li
                key={c.id}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: 14, opacity: 0.7 }}>
                  {new Date(c.createdAt).toLocaleString()}
                </div>
                <div style={{ fontWeight: 600 }}>{c.reason || "Sin motivo"}</div>
                <div style={{ fontSize: 14, opacity: 0.8 }}>
                  Dx: {c.diagnosis || "Sin diagnóstico"}
                </div>
              </li>
            ))}
          </ul>
        )}
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
