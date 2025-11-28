import React, { useMemo, useState } from "react";
import { createAnamnesis, deleteAnamnesis, getAnamnesisByPatientId } from "@/services/anamnesisStorage";

const ITEMS_PER_PAGE = 3; // Menos items porque las anamnesis ocupan más espacio vertical

export default function AnamnesisPanel({ patientId }) {
  const [tick, setTick] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [page, setPage] = useState(1);

  const [form, setForm] = useState({
    diabetes: false, hypertension: false, asthma: false,
    allergies: "", currentMeds: "", surgeries: "", ocularHistory: "", notes: "",
  });

  const list = useMemo(() => getAnamnesisByPatientId(patientId), [patientId, tick]);
  
  // Paginación simple (sin filtro porque suele haber pocas)
  const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE);
  const paginated = list.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleCheckbox = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }));
  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    createAnamnesis({ patientId, ...form });
    setForm({ diabetes: false, hypertension: false, asthma: false, allergies: "", currentMeds: "", surgeries: "", ocularHistory: "", notes: "" });
    setIsCreating(false);
    setTick((t) => t + 1);
  };

  const onDelete = (id) => {
    deleteAnamnesis(id);
    setTick((t) => t + 1);
  };

  return (
    <section style={{ marginTop: 28, display: "grid", gap: 14, background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.2em", color: "#e5e7eb" }}>Anamnesis / Antecedentes</h2>
        <button onClick={() => setIsCreating(!isCreating)} style={{ fontSize: "0.9em", background: isCreating ? "#333" : "#f87171", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
          {isCreating ? "Cancelar" : "+ Nueva Entrada"}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, background: "#111", padding: 15, borderRadius: 8, border: "1px dashed #555" }}>
          <div style={{ display: "flex", gap: 15 }}>
            <label><input type="checkbox" checked={form.diabetes} onChange={handleCheckbox("diabetes")} /> Diabetes</label>
            <label><input type="checkbox" checked={form.hypertension} onChange={handleCheckbox("hypertension")} /> Hipertensión</label>
            <label><input type="checkbox" checked={form.asthma} onChange={handleCheckbox("asthma")} /> Asma</label>
          </div>
          <input placeholder="Alergias" value={form.allergies} onChange={handleChange("allergies")} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
          <input placeholder="Medicamentos actuales" value={form.currentMeds} onChange={handleChange("currentMeds")} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
          <input placeholder="Antecedentes oculares (glaucoma, cataratas...)" value={form.ocularHistory} onChange={handleChange("ocularHistory")} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
          <button type="submit" style={{ background: "#dc2626", color: "white", border: "none", padding: "8px", borderRadius: 4, fontWeight: "bold", cursor: "pointer" }}>Guardar Antecedentes</button>
        </form>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {paginated.length === 0 ? <p style={{ opacity: 0.6, fontSize: 13 }}>No hay registros.</p> : 
          paginated.map((a) => (
            <div key={a.id} style={{ border: "1px solid #333", borderRadius: 8, padding: 12, background: "#111" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <strong>{new Date(a.createdAt).toLocaleString()}</strong>
                <button onClick={() => onDelete(a.id)} style={{ fontSize: 11, background: "none", border: "none", color: "#666", cursor: "pointer" }}>x</button>
              </div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                 <div>DM: {a.diabetes ? "Sí" : "No"} · HTA: {a.hypertension ? "Sí" : "No"}</div>
                 {a.allergies && <div>Alergias: {a.allergies}</div>}
                 {a.ocularHistory && <div style={{color:"#fca5a5"}}>Ojos: {a.ocularHistory}</div>}
              </div>
            </div>
          ))
        }
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ background: "#333", color: "white", padding: "4px 10px", borderRadius: 4, border: "none", opacity: page===1?0.5:1 }}>◀</button>
            <span style={{ fontSize: 12, color: "#888", alignSelf:"center" }}>{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ background: "#333", color: "white", padding: "4px 10px", borderRadius: 4, border: "none", opacity: page===totalPages?0.5:1 }}>▶</button>
        </div>
      )}
    </section>
  );
}