import { useMemo, useState } from "react";
import { getPatients } from "../services/patientsStorage";
import { getAllSales } from "../services/salesStorage";
import { getAllWorkOrders, updateWorkOrder, nextStatus } from "../services/workOrdersStorage";

const STATUS_LABELS = {
  TO_PREPARE: "Por preparar",
  SENT_TO_LAB: "Enviado a laboratorio",
  READY: "Listo para entregar",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

const STATUS_TABS = ["ALL", "TO_PREPARE", "SENT_TO_LAB", "READY", "DELIVERED", "CANCELLED"];

export default function WorkOrdersPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [tick, setTick] = useState(0);

  const patients = useMemo(() => getPatients(), [tick]);
  const patientMap = useMemo(
    () =>
      patients.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {}),
    [patients]
  );
  const salesMap = useMemo(
    () =>
      getAllSales().reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
      }, {}),
    [tick]
  );

  const workOrders = useMemo(() => getAllWorkOrders(), [tick]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return workOrders
      .filter((w) => status === "ALL" || w.status === status)
      .filter((w) => {
        if (!q) return true;
        const patient = patientMap[w.patientId];
        const text = [
          patient?.firstName,
          patient?.lastName,
          patient?.phone,
          w.labName,
          w.type,
          w.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(q);
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [workOrders, status, query, patientMap]);

  const onAdvance = (id, currentStatus) => {
    const next = nextStatus(currentStatus);
    if (next === currentStatus) return;
    updateWorkOrder(id, { status: next });
    setTick((t) => t + 1);
  };

  return (
    <div style={{ color: "white", display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Work Orders</h1>
        <button onClick={() => setTick((t) => t + 1)}>Actualizar</button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatus(tab)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: tab === status ? "rgba(255,255,255,0.12)" : "transparent",
              color: "white",
              cursor: "pointer",
            }}
          >
            {tab === "ALL" ? "Todos" : STATUS_LABELS[tab] || tab}
          </button>
        ))}
      </div>

      <input
        placeholder="Buscar por nombre, teléfono, laboratorio, tipo o status"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          padding: 10,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(255,255,255,0.05)",
          color: "white",
        }}
      />

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <p style={{ opacity: 0.8 }}>No hay work orders con ese filtro.</p>
        ) : (
          filtered.map((o) => {
            const patient = patientMap[o.patientId];
            const sale = o.saleId ? salesMap[o.saleId] : null;
            const due = o.dueDate ? new Date(o.dueDate).toLocaleDateString() : "Sin fecha";
            const canAdvance = !["DELIVERED", "CANCELLED"].includes(o.status);
            return (
              <div
                key={o.id}
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: 12,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <strong>{patient ? `${patient.firstName} ${patient.lastName}` : "Paciente"}</strong>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      {patient?.phone || "Sin teléfono"} · {STATUS_LABELS[o.status] || o.status}
                    </div>
                  </div>
                  {canAdvance && (
                    <button onClick={() => onAdvance(o.id, o.status)}>Avanzar status</button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                  <Metric label="Tipo" value={o.type} />
                  <Metric label="Laboratorio" value={o.labName || "No asignado"} />
                  <Metric label="Entrega estimada" value={due} />
                  {sale && (
                    <>
                      <Metric label="Venta total" value={formatCurrency(sale.total)} />
                      <Metric label="Saldo venta" value={formatCurrency(sale.balance)} />
                    </>
                  )}
                </div>

                {o.rxNotes && (
                  <div>
                    <strong>Notas:</strong>
                    <div style={{ whiteSpace: "pre-wrap" }}>{o.rxNotes}</div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return num.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });
}
