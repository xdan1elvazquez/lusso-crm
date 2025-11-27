import React, { useMemo, useState } from "react";
import { getSalesByPatientId } from "../services/salesStorage";
import {
  createWorkOrder,
  getWorkOrdersByPatientId,
  nextStatus,
  updateWorkOrder,
  deleteWorkOrder,
} from "../services/workOrdersStorage";

const TYPE_OPTIONS = ["LENTES", "LC", "ACCESORIO", "OTRO"];
const STATUS_LABELS = {
  TO_PREPARE: "Por preparar",
  SENT_TO_LAB: "Enviado a laboratorio",
  READY: "Listo para entregar",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export default function WorkOrdersPanel({ patientId }) {
  const [tick, setTick] = useState(0);
  const [form, setForm] = useState({
    type: "LENTES",
    labName: "",
    rxNotes: "",
    saleId: "",
    dueDate: "",
  });

  const sales = useMemo(() => getSalesByPatientId(patientId), [patientId, tick]);
  const orders = useMemo(() => getWorkOrdersByPatientId(patientId), [patientId, tick]);

  const resetForm = () =>
    setForm({
      type: "LENTES",
      labName: "",
      rxNotes: "",
      saleId: "",
      dueDate: "",
    });

  const onSubmit = (e) => {
    e.preventDefault();
    if (!patientId) return;
    createWorkOrder({
      patientId,
      type: form.type,
      labName: form.labName,
      rxNotes: form.rxNotes,
      saleId: form.saleId || null,
      dueDate: form.dueDate,
    });
    resetForm();
    setTick((t) => t + 1);
  };

  const onAdvance = (id, status) => {
    const next = nextStatus(status);
    if (next === status) return;
    updateWorkOrder(id, { status: next });
    setTick((t) => t + 1);
  };

  const onCancel = (id) => {
    updateWorkOrder(id, { status: "CANCELLED" });
    setTick((t) => t + 1);
  };

  const onDelete = (id) => {
    deleteWorkOrder(id);
    setTick((t) => t + 1);
  };

  const saleOptionLabel = (sale) => {
    const desc = sale.description || sale.category || "Venta";
    return `${desc} · Total ${formatCurrency(sale.total)} · Saldo ${formatCurrency(sale.balance)}`;
  };

  return (
    <section style={{ marginTop: 28, display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0 }}>Work Orders</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 760 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Tipo</span>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Laboratorio</span>
            <input
              value={form.labName}
              onChange={(e) => setForm((f) => ({ ...f, labName: e.target.value }))}
              placeholder="Nombre del laboratorio"
            />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Entrega estimada</span>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Venta asociada</span>
            <select
              value={form.saleId}
              onChange={(e) => setForm((f) => ({ ...f, saleId: e.target.value }))}
            >
              <option value="">(Opcional) Selecciona una venta</option>
              {sales.map((s) => (
                <option key={s.id} value={s.id}>
                  {saleOptionLabel(s)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Rx / Notas</span>
          <textarea
            rows={3}
            value={form.rxNotes}
            onChange={(e) => setForm((f) => ({ ...f, rxNotes: e.target.value }))}
            placeholder="Graduación, armazón, especificaciones..."
          />
        </label>

        <button type="submit">Crear work order</button>
      </form>

      <div style={{ display: "grid", gap: 10 }}>
        {orders.length === 0 ? (
          <p style={{ opacity: 0.8 }}>Aún no hay work orders para este paciente.</p>
        ) : (
          orders.map((o) => {
            const due = o.dueDate ? new Date(o.dueDate).toLocaleDateString() : "Sin fecha";
            const sale = sales.find((s) => s.id === o.saleId);
            const canAdvance = !["DELIVERED", "CANCELLED"].includes(o.status);
            return (
              <div
                key={o.id}
                style={{
                  border: "1px solid rgba(255,255,255,.10)",
                  borderRadius: 12,
                  padding: 12,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <strong>{o.type}</strong>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      {STATUS_LABELS[o.status] || o.status} · Creado {new Date(o.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {canAdvance && (
                      <button onClick={() => onAdvance(o.id, o.status)}>Avanzar status</button>
                    )}
                    {o.status !== "CANCELLED" && o.status !== "DELIVERED" && (
                      <button onClick={() => onCancel(o.id)}>Cancelar</button>
                    )}
                    <button onClick={() => onDelete(o.id)}>Eliminar</button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                  <Metric label="Laboratorio" value={o.labName || "Sin asignar"} />
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
                    <strong>Notas Rx:</strong>
                    <div style={{ whiteSpace: "pre-wrap" }}>{o.rxNotes}</div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
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
