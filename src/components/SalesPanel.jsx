import React, { useMemo, useState } from "react";
import {
  addPaymentToSale,
  createSale,
  deleteSale,
  getSalesByPatientId,
} from "../services/salesStorage";

const CATEGORY_OPTIONS = ["LENTES", "CONSULTA", "MEDICAMENTO", "ACCESORIO", "OTRO"];
const PAYMENT_METHODS = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"];

export default function SalesPanel({ patientId }) {
  const [tick, setTick] = useState(0);
  const [form, setForm] = useState({
    category: "LENTES",
    description: "",
    total: "",
    initialPayment: "",
    method: "EFECTIVO",
  });
  const [paymentForms, setPaymentForms] = useState({});

  const sales = useMemo(() => getSalesByPatientId(patientId), [patientId, tick]);

  const resetForm = () =>
    setForm({
      category: "LENTES",
      description: "",
      total: "",
      initialPayment: "",
      method: "EFECTIVO",
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
    createSale({
      patientId,
      category: form.category,
      description: form.description,
      total,
      payments,
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

  return (
    <section style={{ marginTop: 28, display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0 }}>Ventas</h2>

      <form onSubmit={onCreate} style={{ display: "grid", gap: 10, maxWidth: 720 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Categoría</span>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {CATEGORY_OPTIONS.map((opt) => (
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
                      {s.category} · {new Date(s.createdAt).toLocaleString()}
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
