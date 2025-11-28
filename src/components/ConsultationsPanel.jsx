import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createConsultation,
  deleteConsultation,
  getConsultationsByPatient,
} from "@/services/consultationsStorage";

const ITEMS_PER_PAGE = 5;

export default function ConsultationsPanel({ patientId }) {
  const [tick, setTick] = useState(0);
  const [isCreating, setIsCreating] = useState(false); // Controla si se ve el form
  const [search, setSearch] = useState(""); // Filtro
  const [page, setPage] = useState(1); // Paginación

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    type: "OPHTHALMO",
    reason: "",
    diagnosis: "",
    notes: "",
    visitDate: today,
  });

  const allConsultations = useMemo(
    () => getConsultationsByPatient(patientId),
    [patientId, tick]
  );

  // 1. Filtrado
  const filtered = useMemo(() => {
    if (!search) return allConsultations;
    const s = search.toLowerCase();
    return allConsultations.filter(c => 
      (c.diagnosis || "").toLowerCase().includes(s) ||
      (c.reason || "").toLowerCase().includes(s) ||
      (c.notes || "").toLowerCase().includes(s)
    );
  }, [allConsultations, search]);

  // 2. Paginación
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const onSubmit = (e) => {
    e.preventDefault();
    createConsultation({ patientId, ...form });
    setForm({ type: "OPHTHALMO", reason: "", diagnosis: "", notes: "", visitDate: today });
    setIsCreating(false); // Cierra el form al guardar
    setTick((t) => t + 1);
    setPage(1); // Regresa a la primera página
  };

  const onDelete = (id) => {
    if(confirm("¿Borrar consulta?")) {
        deleteConsultation(id);
        setTick((t) => t + 1);
    }
  };

  return (
    <section style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
      {/* HEADER SECCIÓN */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
        <h2 style={{ margin: 0, fontSize: "1.2em", color: "#e5e7eb" }}>Historia Clínica ({allConsultations.length})</h2>
        <button 
          onClick={() => setIsCreating(!isCreating)} 
          style={{ background: isCreating ? "#333" : "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: "0.9em" }}
        >
          {isCreating ? "Cancelar" : "+ Nueva Consulta"}
        </button>
      </div>

      {/* FORMULARIO (Solo visible si isCreating es true) */}
      {isCreating && (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginBottom: 20, padding: 15, background: "#111", borderRadius: 8, border: "1px dashed #444" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ fontSize: 12, color: "#aaa" }}>Fecha
                    <input type="date" value={form.visitDate} onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))} style={{ width: "100%", padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
                </label>
                <label style={{ fontSize: 12, color: "#aaa" }}>Tipo
                    <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} style={{ width: "100%", padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }}>
                        <option value="OPHTHALMO">Oftalmología</option>
                        <option value="REFRACTIVE">Optometría</option>
                        <option value="GENERAL">General</option>
                    </select>
                </label>
            </div>
            <input placeholder="Motivo de consulta" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
            <input placeholder="Diagnóstico" value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} style={{ padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} />
            <button type="submit" style={{ background: "#4ade80", color: "black", border: "none", padding: "8px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>Guardar Registro</button>
        </form>
      )}

      {/* BUSCADOR */}
      {allConsultations.length > 0 && (
          <input 
            placeholder="🔍 Buscar en historial..." 
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: "100%", padding: 8, marginBottom: 15, background: "#111", border: "1px solid #333", color: "white", borderRadius: 6 }}
          />
      )}

      {/* LISTA PAGINADA */}
      <div style={{ display: "grid", gap: 10 }}>
        {paginated.length === 0 ? (
          <p style={{ opacity: 0.6, fontSize: 13, fontStyle: "italic" }}>No hay registros que coincidan.</p>
        ) : (
          paginated.map((c) => (
            <div key={c.id} style={{ border: "1px solid #333", borderRadius: 8, padding: 12, background: "#111" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <span style={{ fontWeight: "bold", color: "#fff" }}>{new Date(c.visitDate || c.createdAt).toLocaleDateString()}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, background: c.type==="OPHTHALMO"?"#1e3a8a":"#064e3b", padding: "2px 6px", borderRadius: 4, color: "#ddd" }}>
                    {c.type === "OPHTHALMO" ? "Médica" : "Optometría"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Link to={`/patients/${patientId}/consultations/${c.id}`} style={{ fontSize: 12, color: "#60a5fa" }}>Ver Detalles ↗</Link>
                  <button onClick={() => onDelete(c.id)} style={{ fontSize: 12, background: "none", border: "none", color: "#666", cursor: "pointer" }}>x</button>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#ccc" }}>
                 {c.diagnosis ? <strong>{c.diagnosis}</strong> : <span style={{opacity:0.7}}>Sin diagnóstico</span>}
                 {c.reason && <div style={{color:"#888", marginTop:2}}>{c.reason}</div>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CONTROLES DE PAGINACIÓN */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 15, alignItems: "center" }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ background: "#333", color: "white", border: "none", padding: "4px 10px", borderRadius: 4, cursor: page===1?"not-allowed":"pointer", opacity: page===1?0.5:1 }}>◀</button>
            <span style={{ fontSize: 12, color: "#888" }}>Pág {page} de {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ background: "#333", color: "white", border: "none", padding: "4px 10px", borderRadius: 4, cursor: page===totalPages?"not-allowed":"pointer", opacity: page===totalPages?0.5:1 }}>▶</button>
        </div>
      )}
    </section>
  );
}