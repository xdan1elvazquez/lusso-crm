import React, { useMemo, useState } from "react";
import { createAnamnesis, deleteAnamnesis, getAnamnesisByPatientId } from "../services/anamnesisStorage";

export default function AnamnesisPanel({ patientId }) {
  const [tick, setTick] = useState(0);
  const [form, setForm] = useState({
    diabetes: false,
    hypertension: false,
    asthma: false,
    allergies: "",
    currentMeds: "",
    surgeries: "",
    ocularHistory: "",
    notes: "",
  });

  const list = useMemo(() => getAnamnesisByPatientId(patientId), [patientId, tick]);

  const handleCheckbox = (key) => (e) => {
    const value = e.target.checked;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleChange = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    createAnamnesis({ patientId, ...form });
    setForm({
      diabetes: false,
      hypertension: false,
      asthma: false,
      allergies: "",
      currentMeds: "",
      surgeries: "",
      ocularHistory: "",
      notes: "",
    });
    setTick((t) => t + 1);
  };

  const onDelete = (id) => {
    deleteAnamnesis(id);
    setTick((t) => t + 1);
  };

  return (
    <section style={{ marginTop: 28, display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0 }}>Anamnesis</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 720 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={form.diabetes} onChange={handleCheckbox("diabetes")} />
            <span>Diabetes</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={form.hypertension} onChange={handleCheckbox("hypertension")} />
            <span>Hipertensión</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={form.asthma} onChange={handleCheckbox("asthma")} />
            <span>Asma</span>
          </label>
        </div>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Alergias</span>
          <textarea rows={2} value={form.allergies} onChange={handleChange("allergies")} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Medicamentos actuales</span>
          <textarea rows={2} value={form.currentMeds} onChange={handleChange("currentMeds")} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Cirugías</span>
          <textarea rows={2} value={form.surgeries} onChange={handleChange("surgeries")} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Antecedentes oculares</span>
          <textarea rows={2} value={form.ocularHistory} onChange={handleChange("ocularHistory")} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Notas</span>
          <textarea rows={3} value={form.notes} onChange={handleChange("notes")} />
        </label>

        <button type="submit">Guardar anamnesis</button>
      </form>

      <div style={{ display: "grid", gap: 10 }}>
        {list.length === 0 ? (
          <p style={{ opacity: 0.8 }}>Aún no hay anamnesis registradas.</p>
        ) : (
          list.map((a) => (
            <div
              key={a.id}
              style={{
                border: "1px solid rgba(255,255,255,.10)",
                borderRadius: 12,
                padding: 12,
                display: "grid",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div>
                  <strong>{new Date(a.createdAt).toLocaleString()}</strong>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    DM: {a.diabetes ? "Sí" : "No"} · HTA: {a.hypertension ? "Sí" : "No"} · Asma:{" "}
                    {a.asthma ? "Sí" : "No"}
                  </div>
                </div>
                <button onClick={() => onDelete(a.id)}>Eliminar</button>
              </div>
              {a.allergies && <p><strong>Alergias:</strong> {a.allergies}</p>}
              {a.currentMeds && <p><strong>Medicamentos:</strong> {a.currentMeds}</p>}
              {a.surgeries && <p><strong>Cirugías:</strong> {a.surgeries}</p>}
              {a.ocularHistory && <p><strong>Antecedentes oculares:</strong> {a.ocularHistory}</p>}
              {a.notes && <p style={{ whiteSpace: "pre-wrap" }}>{a.notes}</p>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
