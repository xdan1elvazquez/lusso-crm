import React, { useMemo, useState } from "react";
import {
  addPaymentToSale,
  createSale,
  deleteSale,
  getSalesByPatientId,
} from "../services/salesStorage";
import { getConsultationsByPatient } from "../services/consultationsStorage";
import RxPicker from "./RxPicker";
import { normalizeRxValue } from "../utils/rxOptions";

const KIND_OPTIONS = ["LENSES", "CONTACT_LENS", "MEDICATION", "ACCESSORY", "CONSULTATION", "OTHER"];
const PAYMENT_METHODS = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"];
const LAB_KINDS = new Set(["LENSES", "CONTACT_LENS"]);

export default function SalesPanel({ patientId }) {
  const [tick, setTick] = useState(0);
  const [form, setForm] = useState({
    kind: "LENSES",
    description: "",
    total: "",
    initialPayment: "",
    method: "EFECTIVO",
    labName: "",
    dueDate: "",
    rxNotes: "",
    consultationId: "",
    rxManual: normalizeRxValue(),
  });
  const [paymentForms, setPaymentForms] = useState({});

  const sales = useMemo(() => getSalesByPatientId(patientId), [patientId, tick]);
  const consultations = useMemo(() => getConsultationsByPatient(patientId), [patientId]);

  const resetForm = () =>
    setForm({
      kind: "LENSES",
      description: "",
      total: "",
      initialPayment: "",
      method: "EFECTIVO",
      labName: "",
      dueDate: "",
      rxNotes: "",
      consultationId: "",
      rxManual: normalizeRxValue(),
    });

  const onCreate = (e) => {
    e.preventDefault();
    const total = Number(form.total);
    if (!patientId || Number.isNaN(total) || total <= 0) return;
    const initialAmount = Number(form.initialPayment) || 0;
    const payments =
      initialAmount > 0
        ? [
            {
              amount: initialAmount,
              method: form.method,
              paidAt: new Date().toISOString(),
            },
          ]
        : [];
    const requiresLab = LAB_KINDS.has(form.kind);
    const consultationSelected = consultations.find((c) => c.id === form.consultationId);
    const rxSnapshot =
      requiresLab && consultationSelected?.rx
        ? normalizeRxValue(consultationSelected.rx)
        : requiresLab
        ? normalizeRxValue(form.rxManual)
        : null;
    createSale({
      patientId,
      kind: form.kind,
      description: form.description,
      total,
      payments,
      items: [
        {
          kind: form.kind,
          description: form.description,
          qty: 1,
          unitPrice: total,
          requiresLab,
          consultationId: form.consultationId || null,
          rxSnapshot,
          labName: requiresLab ? form.labName : "",
          dueDate: requiresLab ? form.dueDate : null,
        },
      ],
    });
    resetForm();
    setTick((t) => t + 1);
  };

  const onAddPayment = (saleId, balance) => (e) => {
    e.preventDefault();
    const data = paymentForms[saleId] || { amount: "", method: "EFECTIVO" };
    const amount = Number(data.amount);
    if (Number.isNaN(amount) || amount <= 0 || balance <= 0) return;
    addPaymentToSale(saleId, {
      amount,
      method: data.method,
      paidAt: new Date().toISOString(),
    });
    setPaymentForms((prev) => ({
      ...prev,
      [saleId]: { amount: "", method: data.method },
    }));
    setTick((t) => t + 1);
  };

  const onDelete = (id) => {
    deleteSale(id);
    setTick((t) => t + 1);
  };

  const updatePaymentForm = (saleId, field, value) => {
    setPaymentForms((prev) => ({
      ...prev,
      [saleId]: { amount: "", method: "EFECTIVO", ...prev[saleId], [field]: value },
    }));
  };

  const isLabKind = LAB_KINDS.has(form.kind);

  return (
    <section style={{ marginTop: 28, display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0 }}>Ventas</h2>

      <form onSubmit={onCreate} style={{ display: "grid", gap: 10, maxWidth: 720 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Tipo</span>
          <select
            value={form.kind}
            onChange={(e) => {
              const nextKind = e.target.value;
              setForm((f) => ({
                ...f,
                kind: nextKind,
                labName: LAB_KINDS.has(nextKind) ? f.labName : "",
                dueDate: LAB_KINDS.has(nextKind) ? f.dueDate : "",
                rxNotes: LAB_KINDS.has(nextKind) ? f.rxNotes : "",
              }));
            }}
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Descripción</span>
          <input
            placeholder="Producto/servicio"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>

        {consultations.length > 0 && (
          <label style={{ display: "grid", gap: 4 }}>
            <span>Consulta relacionada (opcional)</span>
            <select
              value={form.consultationId}
              onChange={(e) => setForm((f) => ({ ...f, consultationId: e.target.value }))}
            >
              <option value="">Sin consulta</option>
              {consultations.map((c) => (
                <option key={c.id} value={c.id}>
                  {new Date(c.visitDate || c.createdAt).toLocaleDateString()} · {c.reason || "Consulta"}
                </option>
              ))}
            </select>
          </label>
        )}

        {isLabKind && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
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
            </div>
            <label style={{ display: "grid", gap: 4 }}>
              <span>Notas / Rx</span>
              <textarea
                rows={3}
                value={form.rxNotes}
                onChange={(e) => setForm((f) => ({ ...f, rxNotes: e.target.value }))}
                placeholder="Graduación, especificaciones..."
              />
            </label>
            {form.consultationId ? (
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                Usando Rx de la consulta seleccionada (copia estática en la venta).
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                <strong>Rx para la venta</strong>
                <RxPicker
                  value={form.rxManual}
                  onChange={(rx) => setForm((f) => ({ ...f, rxManual: rx }))}
                />
              </div>
            )}
          </>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Total</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.total}
              onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Anticipo (opcional)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.initialPayment}
              onChange={(e) => setForm((f) => ({ ...f, initialPayment: e.target.value }))}
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Método anticipo</span>
            <select
              value={form.method}
              onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
            >
              {PAYMENT_METHODS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="submit">Crear venta</button>
      </form>

      <div style={{ display: "grid", gap: 10 }}>
        {sales.length === 0 ? (
          <p style={{ opacity: 0.8 }}>Aún no hay ventas registradas.</p>
        ) : (
          sales.map((s) => {
            const paymentState = paymentForms[s.id] || { amount: "", method: "EFECTIVO" };
            return (
              <div
                key={s.id}
                style={{
                  border: "1px solid rgba(255,255,255,.10)",
                  borderRadius: 12,
                  padding: 12,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <strong>{s.description || "Venta sin descripción"}</strong>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      {(s.items?.[0]?.kind || s.kind || "VENTA")} · {new Date(s.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button onClick={() => onDelete(s.id)}>Eliminar</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                  <Metric label="Total" value={formatCurrency(s.total)} />
                  <Metric label="Pagado" value={formatCurrency(s.paidAmount)} />
                  <Metric label="Saldo" value={formatCurrency(s.balance)} />
                  <Metric label="Estado" value={s.status === "PAID" ? "Pagado" : "Pendiente"} />
                </div>

                {s.payments.length > 0 && (
                  <div style={{ display: "grid", gap: 6 }}>
                    <strong>Abonos</strong>
                    <ul style={{ paddingLeft: 16, margin: 0, display: "grid", gap: 4 }}>
                      {s.payments.map((p) => (
                        <li key={p.id} style={{ opacity: 0.85 }}>
                          {formatCurrency(p.amount)} · {p.method || "Método no especificado"} ·{" "}
                          {new Date(p.paidAt).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <form onSubmit={onAddPayment(s.id, s.balance)} style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span>Nuevo abono</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentState.amount}
                        onChange={(e) => updatePaymentForm(s.id, "amount", e.target.value)}
                        placeholder={`Saldo: ${formatCurrency(s.balance)}`}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span>Método</span>
                      <select
                        value={paymentState.method}
                        onChange={(e) => updatePaymentForm(s.id, "method", e.target.value)}
                      >
                        {PAYMENT_METHODS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="submit" disabled={s.balance <= 0}>
                      Agregar abono
                    </button>
                    <span style={{ opacity: 0.8, fontSize: 13 }}>
                      Saldo actual: {formatCurrency(s.balance)}
                    </span>
                  </div>
                </form>
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
