import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { 
  getExamsByPatient, 
  createEyeExam, 
  deleteEyeExam 
} from "@/services/eyeExamStorage";
import RxPicker from "@/components/RxPicker";
import { normalizeRxValue } from "@/utils/rxOptions";
import { validateRx } from "@/utils/validators";

const ITEMS_PER_PAGE = 5;

export default function EyeExamsPanel({ patientId, onSell }) {
  const [tick, setTick] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  
  // Estados del formulario
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [prelim, setPrelim] = useState({ avsc: { od: "", oi: "" }, avcc: { od: "", oi: "" }, autorefrac: { od: "", oi: "" }, ishihara: "", iop: { od: "", oi: "" } });
  const [rx, setRx] = useState(normalizeRxValue());
  const [recs, setRecs] = useState({ design: "", material: "", coating: "", usage: "" });
  const [cl, setCl] = useState({ design: "", brand: "", od: { baseCurve: "", diameter: "", power: "" }, oi: { baseCurve: "", diameter: "", power: "" } });
  const [errors, setErrors] = useState({});

  const allExams = useMemo(() => getExamsByPatient(patientId), [patientId, tick]);

  // Filtro y Paginación
  const filtered = useMemo(() => {
    if(!search) return allExams;
    return allExams.filter(e => (e.notes || "").toLowerCase().includes(search.toLowerCase()) || (e.recommendations?.design || "").toLowerCase().includes(search.toLowerCase()));
  }, [allExams, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleCreate = (e) => {
    e.preventDefault();
    const validation = validateRx(rx);
    if (!validation.isValid) { setErrors(validation.errors); return; }

    createEyeExam({
      patientId,
      consultationId: null, 
      examDate: formDate,
      preliminary: { avsc: prelim.avsc, avcc: prelim.avcc, autorefrac: prelim.autorefrac, lensometry: null },
      triage: { iop: prelim.iop, ishihara: prelim.ishihara },
      rx: rx, recommendations: recs, contactLens: cl, notes: notes
    });

    // Reset
    setRx(normalizeRxValue()); setNotes(""); setErrors({}); setIsCreating(false); setTick(t => t + 1); setPage(1);
  };

  const handleDelete = (id) => {
    if(confirm("¿Eliminar este examen?")) { deleteEyeExam(id); setTick(t => t + 1); }
  };

  const SmallInput = ({ label, value, onChange, placeholder, width = "60px" }) => (
    <label style={{ display: "block", fontSize: 12 }}>
      <div style={{color:"#888", marginBottom: 2}}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width, background: "#222", border: "1px solid #444", color: "white", padding: 4, borderRadius: 4 }} />
    </label>
  );

  return (
    <section style={{ marginTop: 28, display: "grid", gap: 14, background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.2em", color: "#e5e7eb" }}>Exámenes de Vista ({allExams.length})</h2>
        <button onClick={() => setIsCreating(!isCreating)} style={{ fontSize: "0.9em", background: isCreating ? "#333" : "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
          {isCreating ? "Cancelar" : "+ Nuevo Examen"}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} style={{ background: "#111", padding: 20, borderRadius: 10, border: "1px dashed #444", display: "grid", gap: 20, marginBottom: 20 }}>
           {/* ... (CONTENIDO DEL FORMULARIO IGUAL QUE ANTES, SOLO LO ENVUELVO) ... */}
           <div style={{ display: "flex", gap: 20, borderBottom: "1px solid #333", paddingBottom: 15 }}>
             <label><span style={{color:"#aaa", fontSize:13}}>Fecha</span><input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={{ display:"block", background: "#222", border: "1px solid #444", color: "white", padding: 6, borderRadius: 4 }} /></label>
           </div>
           {/* RX y DEMÁS CAMPOS */}
           <div style={{ background: "#1a1a1a", padding: 15, borderRadius: 8 }}><h4 style={{ margin: "0 0 10px 0", color: "#4ade80" }}>Refracción</h4><RxPicker value={rx} onChange={setRx} /></div>
           <div style={{ background: "#1a1a1a", padding: 15, borderRadius: 8 }}><h4 style={{ margin: "0 0 10px 0", color: "#f472b6" }}>Lentes de Contacto</h4><div style={{display:"flex", gap:10}}><SmallInput label="Marca" width="100%" value={cl.brand} onChange={v => setCl({...cl, brand: v})} /><SmallInput label="Poder OD" width="80px" value={cl.od.power} onChange={v => setCl({...cl, od: {...cl.od, power: v}})} /><SmallInput label="Poder OI" width="80px" value={cl.oi.power} onChange={v => setCl({...cl, oi: {...cl.oi, power: v}})} /></div></div>
           
           <button type="submit" style={{ padding: "10px", background: "#4ade80", color: "black", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}>Guardar Examen</button>
        </form>
      )}

      {/* BUSCADOR */}
      {allExams.length > 0 && <input placeholder="🔍 Buscar en notas o diseño..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: "100%", padding: 8, background: "#111", border: "1px solid #333", color: "white", borderRadius: 6 }} />}

      {/* LISTA */}
      <div style={{ display: "grid", gap: 10 }}>
        {paginated.length === 0 ? <p style={{ opacity: 0.6, fontSize: 13 }}>No hay registros.</p> : 
          paginated.map(exam => (
            <div key={exam.id} style={{ border: "1px solid #333", borderRadius: 10, padding: 12, background: "#111" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <strong style={{ color: "#fff" }}>{new Date(exam.examDate).toLocaleDateString()}</strong>
                  <span style={{ marginLeft: 10, fontSize: 11, padding: "2px 6px", borderRadius: 4, background: exam.consultationId ? "#1e3a8a" : "#064e3b", color: "#ddd" }}>
                    {exam.consultationId ? "Vinculado" : "Independiente"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button onClick={() => onSell && onSell(exam)} style={{ background: "#16a34a", color: "white", border: "none", padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: "0.8em", fontWeight: "bold" }}>🛒 Vender</button>
                  <button onClick={() => handleDelete(exam.id)} style={{ fontSize: 11, background: "transparent", border: "none", color: "#666", cursor: "pointer" }}>x</button>
                </div>
              </div>
              <div style={{ fontSize: "0.9em", color: "#ccc", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                 <span>OD: {exam.rx.od.sph} / {exam.rx.od.cyl} x {exam.rx.od.axis}°</span>
                 <span>OI: {exam.rx.os.sph} / {exam.rx.os.cyl} x {exam.rx.os.axis}°</span>
              </div>
            </div>
          ))
        }
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ background: "#333", color: "white", border: "none", padding: "4px 10px", borderRadius: 4, opacity: page===1?0.5:1 }}>◀</button>
            <span style={{ fontSize: 12, color: "#888", alignSelf:"center" }}>{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ background: "#333", color: "white", border: "none", padding: "4px 10px", borderRadius: 4, opacity: page===totalPages?0.5:1 }}>▶</button>
        </div>
      )}
    </section>
  );
}