import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createConsultation,
  deleteConsultation,
  getConsultationsByPatient,
} from "../services/consultationsStorage";

export default function ConsultationsPanel({ patientId }) {
  const [tick, setTick] = useState(0);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    type: "REFRACTIVE",
    reason: "",
    diagnosis: "",
    notes: "",
    visitDate: today,
  });

  const consultations = useMemo(
    () => getConsultationsByPatient(patientId),
    // tick fuerza recalcular al guardar/borrar
    [patientId, tick]
  );

  const onSubmit = (e) => {
    e.preventDefault();
    createConsultation({ patientId, ...form });
    setForm({ type: "REFRACTIVE", reason: "", diagnosis: "", notes: "", visitDate: today });
    setTick((t) => t + 1);
  };

  const onDelete = (id) => {
    deleteConsultation(id);
    setTick((t) => t + 1);
  };

  return (
    <section style={{ marginTop: 20 }}>
      <h2 style={{ marginBottom: 10 }}>Consultas</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 680 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Fecha de atención</span>
          <input
            type="date"
            value={form.visitDate}
            onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
          />
        </label>
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
        >
          <option value="REFRACTIVE">Examen de la vista</option>
          <option value="OPHTHALMO">Consulta oftalmológica</option>
        </select>

        <input
          placeholder="Motivo de consulta"
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
        />
        <input
          placeholder="Diagnóstico (texto corto)"
          value={form.diagnosis}
          onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
        />
        <textarea
          placeholder="Notas"
          rows={4}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />

        <button type="submit">Guardar consulta</button>
      </form>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {consultations.length === 0 ? (
          <p style={{ opacity: 0.8 }}>Aún no hay consultas registradas.</p>
        ) : (
          consultations.map((c) => (
            <div
              key={c.id}
              style={{
                border: "1px solid rgba(255,255,255,.10)",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong>
                    {c.type === "OPHTHALMO" ? "Oftalmología" : "Examen de la vista"}
                  </strong>
                  <div style={{ opacity: 0.8, fontSize: 13 }}>
                    {new Date(c.visitDate || c.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link to={`/patients/${patientId}/consultations/${c.id}`} style={{ alignSelf: "center" }}>
                    Ver detalle
                  </Link>
                  <button onClick={() => onDelete(c.id)}>Eliminar</button>
                </div>
              </div>

              {c.reason && <p><strong>Motivo:</strong> {c.reason}</p>}
              {c.diagnosis && <p><strong>Dx:</strong> {c.diagnosis}</p>}
              {c.notes && <p style={{ whiteSpace: "pre-wrap" }}>{c.notes}</p>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
