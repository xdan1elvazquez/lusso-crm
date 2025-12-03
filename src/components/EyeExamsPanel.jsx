import React, { useMemo, useState, useEffect } from "react";
import { 
  getExamsByPatient, 
  createEyeExam, 
  updateEyeExam,
  deleteEyeExam 
} from "@/services/eyeExamStorage";
import RxPicker from "@/components/RxPicker";
import { normalizeRxValue } from "@/utils/rxOptions";
import { validateRx } from "@/utils/validators";

const TABS = { PRELIM: "prelim", REFRACTION: "refraction", CONTACT: "contact" };

// --- HELPER: PORCENTAJES AV ---
function getVaPercentage(value) {
  if (!value || typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase();
  if (clean.includes('/')) {
    const [num, den] = clean.split('/');
    const n = parseFloat(num);
    const d = parseFloat(den);
    if (!isNaN(n) && !isNaN(d) && d !== 0) {
      const ratio = n / d;
      return Math.min(Math.round(ratio * 100), 100);
    }
  }
  const decimal = parseFloat(clean);
  if (!isNaN(decimal)) {
    if (decimal <= 2.0) return Math.round(decimal * 100);
    if (decimal >= 10) return Math.round((20 / decimal) * 100);
  }
  return null;
}

const inputStyle = { width: "100%", padding: "8px", background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 };

const TabButton = ({ id, label, activeTab, setActiveTab }) => (
  <button 
    type="button"
    onClick={() => setActiveTab(id)}
    style={{
      flex: 1, padding: "10px", background: activeTab === id ? "#2563eb" : "#333", color: "white", border: "none",
      borderBottom: activeTab === id ? "2px solid white" : "2px solid transparent", cursor: "pointer", fontWeight: "bold"
    }}
  >
    {label}
  </button>
);

const AvInput = ({ label, valOD, valOS, valAO, onChange, prevData }) => {
  const RenderDiff = ({ current, prev }) => {
    if (!prev) return null;
    const prevPct = getVaPercentage(prev);
    if (!current) return <span style={{color: "#666", fontSize: "0.8em", marginLeft: 4}}> (Prev: {prev}{prevPct ? ` ≈ ${prevPct}%` : ''})</span>;
    const currPct = getVaPercentage(current);
    if (prevPct !== null && currPct !== null) {
        const diff = currPct - prevPct;
        let color = "#888";
        let icon = "=";
        if (diff > 0) { color = "#4ade80"; icon = "▲"; }
        if (diff < 0) { color = "#f87171"; icon = "▼"; }
        return <span style={{color, fontSize: "0.8em", marginLeft: 6, fontWeight: "bold"}}>{prevPct}% ➜ {currPct}% {icon}</span>;
    }
    return <span style={{color: "#666", fontSize: "0.8em"}}> (Prev: {prev})</span>;
  };

  return (
    <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #333" }}>
      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <label><div style={{fontSize:10, color:"#60a5fa", marginBottom:2}}>OD <RenderDiff current={valOD} prev={prevData?.od} /></div><input value={valOD} onChange={e => onChange('od', e.target.value)} style={inputStyle} placeholder="20/..." /></label>
        <label><div style={{fontSize:10, color:"#60a5fa", marginBottom:2}}>OS <RenderDiff current={valOS} prev={prevData?.os} /></div><input value={valOS} onChange={e => onChange('os', e.target.value)} style={inputStyle} placeholder="20/..." /></label>
        <label><div style={{fontSize:10, color:"#fff", marginBottom:2}}>AO <RenderDiff current={valAO} prev={prevData?.ao} /></div><input value={valAO} onChange={e => onChange('ao', e.target.value)} style={inputStyle} placeholder="20/..." /></label>
      </div>
    </div>
  );
};

export default function EyeExamsPanel({ patientId, onSell }) {
  const [loading, setLoading] = useState(true);
  const [allExams, setAllExams] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.PRELIM);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  
  const [prelim, setPrelim] = useState({ avsc: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } }, avcc: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } }, cv: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } }, ishihara: "", motility: "", lensometry: normalizeRxValue() });
  const [refraction, setRefraction] = useState({ autorefrac: { od: "", os: "" }, finalRx: normalizeRxValue(), finalAv: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } } });
  const [cl, setCl] = useState({ keratometry: { od: { k1:"", k2:"", axis:"" }, os: { k1:"", k2:"", axis:"" } }, trial: { od: { baseCurve:"", diameter:"", power:"", av:"", overRefraction:"" }, os: { baseCurve:"", diameter:"", power:"", av:"", overRefraction:"" }, notes: "" }, final: { design: "", brand: "", od: { baseCurve:"", diameter:"", power:"" }, os: { baseCurve:"", diameter:"", power:"" } } });
  const [recs, setRecs] = useState({ design: "", material: "", coating: "", usage: "" });

  const refreshData = async () => {
      setLoading(true);
      try {
          const data = await getExamsByPatient(patientId);
          setAllExams(data);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => { refreshData(); }, [patientId]);

  const prevExam = useMemo(() => {
      const history = allExams.filter(e => e.id !== editingId);
      return history.length > 0 ? history[0] : null;
  }, [allExams, editingId]);

  const filtered = useMemo(() => {
    if(!search) return allExams;
    return allExams.filter(e => (e.notes || "").toLowerCase().includes(search.toLowerCase()));
  }, [allExams, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const resetForm = () => {
    setFormDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setPrelim({ avsc: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } }, avcc: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } }, cv: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } }, ishihara: "", motility: "", lensometry: normalizeRxValue() });
    setRefraction({ autorefrac: { od: "", os: "" }, finalRx: normalizeRxValue(), finalAv: { far: { od: "", os: "", ao: "" }, near: { od: "", os: "", ao: "" } } });
    setCl({ keratometry: { od: { k1:"", k2:"", axis:"" }, os: { k1:"", k2:"", axis:"" } }, trial: { od: { baseCurve:"", diameter:"", power:"", av:"", overRefraction:"" }, os: { baseCurve:"", diameter:"", power:"", av:"", overRefraction:"" }, notes: "" }, final: { design: "", brand: "", od: { baseCurve:"", diameter:"", power:"" }, os: { baseCurve:"", diameter:"", power:"" } } });
    setRecs({ design: "", material: "", coating: "", usage: "" });
    setEditingId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const validation = validateRx(refraction.finalRx);
    if (!validation.isValid && (!cl.final.brand && !prelim.avsc.far.od)) {
       alert("Ingresa al menos Refracción, Preliminares o LC."); return;
    }
    const payload = {
      patientId, consultationId: null, examDate: formDate,
      preliminary: prelim, refraction: refraction, contactLens: cl, recommendations: recs, notes: notes
    };
    
    if (editingId) await updateEyeExam(editingId, payload); 
    else await createEyeExam(payload);
    
    resetForm(); 
    setIsCreating(false);
    refreshData();
  };

  const handleEdit = (exam) => {
    setEditingId(exam.id);
    setFormDate(new Date(exam.examDate).toISOString().slice(0, 10));
    setNotes(exam.notes || "");
    setPrelim({
        ...exam.preliminary,
        avsc: { far: exam.preliminary?.avsc?.far || {}, near: exam.preliminary?.avsc?.near || {} },
        avcc: { far: exam.preliminary?.avcc?.far || {}, near: exam.preliminary?.avcc?.near || {} },
        cv: { far: exam.preliminary?.cv?.far || {}, near: exam.preliminary?.cv?.near || {} }
    });
    setRefraction(exam.refraction || { finalRx: normalizeRxValue(), autorefrac:{od:"",os:""}, finalAv:{far:{},near:{}} });
    setCl(exam.contactLens || { keratometry:{od:{},os:{}}, trial:{od:{},os:{}}, final:{od:{},os:{}} });
    setRecs(exam.recommendations || {});
    setIsCreating(true);
    setTimeout(() => document.getElementById("exam-form")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleDelete = async (id) => { 
      if(confirm("¿Eliminar?")) { 
          await deleteEyeExam(id); 
          refreshData(); 
      } 
  };

  return (
    <section style={{ marginTop: 28, display: "grid", gap: 14, background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.2em", color: "#e5e7eb" }}>Exámenes de Vista ({allExams.length})</h2>
        <button onClick={() => { resetForm(); setIsCreating(!isCreating); }} style={{ fontSize: "0.9em", background: isCreating ? "#333" : "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
          {isCreating ? "Cancelar" : "+ Nuevo Examen"}
        </button>
      </div>

      {isCreating && (
        <div id="exam-form" style={{ background: "#111", borderRadius: 10, border: "1px solid #444", overflow: "hidden" }}>
           <div style={{ display: "flex", borderBottom: "1px solid #444" }}>
              <TabButton id={TABS.PRELIM} label="1. Preliminares" activeTab={activeTab} setActiveTab={setActiveTab} />
              <TabButton id={TABS.REFRACTION} label="2. Refracción" activeTab={activeTab} setActiveTab={setActiveTab} />
              <TabButton id={TABS.CONTACT} label="3. Lentes de Contacto" activeTab={activeTab} setActiveTab={setActiveTab} />
           </div>
           
           <form onSubmit={handleSave} style={{ padding: 20, display: "grid", gap: 20 }}>
              <div style={{ display: "flex", gap: 10 }}>
                 <label style={{fontSize:12, color:"#aaa"}}>Fecha: <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={{...inputStyle, marginLeft:10, width:"auto"}} /></label>
              </div>

              {activeTab === TABS.PRELIM && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                   <div>
                      <h4 style={{color:"#fbbf24", marginTop:0}}>Agudeza Visual Entrada (SC)</h4>
                      <AvInput label="Lejos" valOD={prelim.avsc.far.od} valOS={prelim.avsc.far.os} valAO={prelim.avsc.far.ao} 
                        onChange={(eye, v) => setPrelim(p => ({...p, avsc: {...p.avsc, far: {...p.avsc.far, [eye]: v}}}))} prevData={prevExam?.preliminary?.avsc?.far} />
                      <AvInput label="Cerca" valOD={prelim.avsc.near.od} valOS={prelim.avsc.near.os} valAO={prelim.avsc.near.ao} 
                        onChange={(eye, v) => setPrelim(p => ({...p, avsc: {...p.avsc, near: {...p.avsc.near, [eye]: v}}}))} prevData={prevExam?.preliminary?.avsc?.near} />
                   </div>
                   <div>
                      <h4 style={{color:"#60a5fa", marginTop:0}}>Capacidad Visual (Pin Hole)</h4>
                      <AvInput label="Lejos" valOD={prelim.cv.far.od} valOS={prelim.cv.far.os} valAO={prelim.cv.far.ao} 
                        onChange={(eye, v) => setPrelim(p => ({...p, cv: {...p.cv, far: {...p.cv.far, [eye]: v}}}))} prevData={prevExam?.preliminary?.cv?.far} />
                      <AvInput label="Cerca" valOD={prelim.cv.near.od} valOS={prelim.cv.near.os} valAO={prelim.cv.near.ao} 
                        onChange={(eye, v) => setPrelim(p => ({...p, cv: {...p.cv, near: {...p.cv.near, [eye]: v}}}))} prevData={prevExam?.preliminary?.cv?.near} />
                      
                      <div style={{marginTop:20}}>
                         <label style={{fontSize:12, color:"#aaa", display:"block", marginBottom:5}}>Ishihara</label>
                         <input value={prelim.ishihara} onChange={e => setPrelim(p => ({...p, ishihara: e.target.value}))} style={inputStyle} placeholder="Normal / Protanopia..." />
                      </div>
                   </div>
                </div>
              )}

              {activeTab === TABS.REFRACTION && (
                <div style={{ display: "grid", gap: 20 }}>
                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background:"#1a1a1a", padding:10, borderRadius:8 }}>
                      <label style={{fontSize:12, color:"#aaa"}}>Autorefractómetro OD <input value={refraction.autorefrac.od} onChange={e => setRefraction(r => ({...r, autorefrac: {...r.autorefrac, od: e.target.value}}))} style={inputStyle} placeholder="-2.00 -0.50 x 180" /></label>
                      <label style={{fontSize:12, color:"#aaa"}}>Autorefractómetro OS <input value={refraction.autorefrac.os} onChange={e => setRefraction(r => ({...r, autorefrac: {...r.autorefrac, os: e.target.value}}))} style={inputStyle} placeholder="-2.00 -0.50 x 180" /></label>
                   </div>
                   
                   <div style={{ background:"#1a1a1a", padding:15, borderRadius:8, border:"1px solid #4ade80" }}>
                      <h4 style={{color:"#4ade80", margin:"0 0 10px 0"}}>Refracción Final (Rx)</h4>
                      <RxPicker value={refraction.finalRx} onChange={v => setRefraction(r => ({...r, finalRx: v}))} />
                      <div style={{marginTop:15, paddingTop:10, borderTop:"1px dashed #444"}}>
                          <h5 style={{margin:"0 0 10px 0", color:"#4ade80"}}>Agudeza Visual Final (Con Rx Nueva)</h5>
                          <AvInput label="Lejos" valOD={refraction.finalAv.far.od} valOS={refraction.finalAv.far.os} valAO={refraction.finalAv.far.ao} 
                            onChange={(eye, v) => setRefraction(r => ({...r, finalAv: {...r.finalAv, far: {...r.finalAv.far, [eye]: v}}}))} prevData={prevExam?.refraction?.finalAv?.far} />
                      </div>
                   </div>

                   <div style={{ background: "#2e1065", padding: 15, borderRadius: 8 }}>
                      <h4 style={{ margin: "0 0 10px 0", color: "#c4b5fd" }}>Recomendación</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                         <input placeholder="Diseño" value={recs.design} onChange={e => setRecs({...recs, design: e.target.value})} style={inputStyle} />
                         <input placeholder="Material" value={recs.material} onChange={e => setRecs({...recs, material: e.target.value})} style={inputStyle} />
                         <input placeholder="Tratamiento" value={recs.coating} onChange={e => setRecs({...recs, coating: e.target.value})} style={inputStyle} />
                         <input placeholder="Uso" value={recs.usage} onChange={e => setRecs({...recs, usage: e.target.value})} style={inputStyle} />
                      </div>
                   </div>
                </div>
              )}

              {activeTab === TABS.CONTACT && (
                 <div style={{ display: "grid", gap: 20 }}>
                    <div style={{ background:"#1a1a1a", padding:15, borderRadius:8 }}>
                        <h4 style={{margin:"0 0 10px 0", color:"#f472b6"}}>1. Queratometría</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 1fr 1fr", gap: 10, alignItems: "center", marginBottom: 5 }}>
                            <span style={{fontWeight:"bold", color:"#aaa"}}>OD</span>
                            <input placeholder="K1" value={cl.keratometry.od.k1} onChange={e => setCl(c => ({...c, keratometry: {...c.keratometry, od: {...c.keratometry.od, k1: e.target.value}}}))} style={inputStyle} />
                            <input placeholder="K2" value={cl.keratometry.od.k2} onChange={e => setCl(c => ({...c, keratometry: {...c.keratometry, od: {...c.keratometry.od, k2: e.target.value}}}))} style={inputStyle} />
                            <input placeholder="Eje" value={cl.keratometry.od.axis} onChange={e => setCl(c => ({...c, keratometry: {...c.keratometry, od: {...c.keratometry.od, axis: e.target.value}}}))} style={inputStyle} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 1fr 1fr", gap: 10, alignItems: "center" }}>
                            <span style={{fontWeight:"bold", color:"#aaa"}}>OS</span>
                            <input placeholder="K1" value={cl.keratometry.os.k1} onChange={e => setCl(c => ({...c, keratometry: {...c.keratometry, os: {...c.keratometry.os, k1: e.target.value}}}))} style={inputStyle} />
                            <input placeholder="K2" value={cl.keratometry.os.k2} onChange={e => setCl(c => ({...c, keratometry: {...c.keratometry, os: {...c.keratometry.os, k2: e.target.value}}}))} style={inputStyle} />
                            <input placeholder="Eje" value={cl.keratometry.os.axis} onChange={e => setCl(c => ({...c, keratometry: {...c.keratometry, os: {...c.keratometry.os, axis: e.target.value}}}))} style={inputStyle} />
                        </div>
                    </div>
                    <div style={{ background:"#1a1a1a", padding:15, borderRadius:8 }}>
                        <h4 style={{margin:"0 0 10px 0", color:"#f472b6"}}>2. Lente de Prueba</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "50px repeat(4, 1fr)", gap: 8, alignItems: "center", marginBottom: 8 }}>
                            <span style={{fontWeight:"bold", color:"#aaa"}}>OD</span>
                            <input placeholder="KB" value={cl.trial.od.baseCurve} onChange={e => setCl(c => ({...c, trial: {...c.trial, od: {...c.trial.od, baseCurve: e.target.value}}}))} style={inputStyle} />
                            <input placeholder="Diam" value={cl.trial.od.diameter} onChange={e => setCl(c => ({...c, trial: {...c.trial, od: {...c.trial.od, diameter: e.target.value}}}))} style={inputStyle} />
                            <input placeholder="Poder" value={cl.trial.od.power} onChange={e => setCl(c => ({...c, trial: {...c.trial, od: {...c.trial.od, power: e.target.value}}}))} style={inputStyle} />
                            <input placeholder="Sobrerefracción" value={cl.trial.od.overRefraction} onChange={e => setCl(c => ({...c, trial: {...c.trial, od: {...c.trial.od, overRefraction: e.target.value}}}))} style={inputStyle} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "50px repeat(4, 1fr)", gap: 8, alignItems: "center" }}>
                            <span style={{fontWeight:"bold", color:"#aaa"}}>OS</span>
                            <input placeholder="KB" value={cl.trial.os.baseCurve} onChange={e => setCl(c => ({...c, trial: {...c.trial, os: {...c.trial.os, baseCurve: e.target.value}}}))} style={inputStyle} />
                            <input placeholder="Diam" value={cl.trial.os.diameter} onChange={e => setCl(c => ({...c, trial: {...c.trial, os: {...c.trial.os, diameter: e.target.value}}}))} style={inputStyle} />
                            <input placeholder="Poder" value={cl.trial.os.power} onChange={e => setCl(c => ({...c, trial: {...c.trial, os: {...c.trial.os, power: e.target.value}}}))} style={inputStyle} />
                            <input placeholder="Sobrerefracción" value={cl.trial.os.overRefraction} onChange={e => setCl(c => ({...c, trial: {...c.trial, os: {...c.trial.os, overRefraction: e.target.value}}}))} style={inputStyle} />
                        </div>
                        <textarea placeholder="Notas..." rows={2} value={cl.trial.notes} onChange={e => setCl(c => ({...c, trial: {...c.trial, notes: e.target.value}}))} style={{...inputStyle, marginTop:10}} />
                    </div>
                 </div>
              )}

              <div style={{ borderTop: "1px solid #333", marginTop: 20, paddingTop: 20 }}>
                 <textarea placeholder="Observaciones generales..." rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={inputStyle} />
                 <button type="submit" style={{ marginTop: 15, padding: "12px", background: "#2563eb", color: "white", border: "none", borderRadius: 6, fontWeight: "bold", width: "100%", cursor: "pointer" }}>{editingId ? "Actualizar Examen" : "Guardar Examen"}</button>
              </div>
           </form>
        </div>
      )}

      {loading ? <div style={{padding:20, color:"#666"}}>Cargando exámenes...</div> : (
          <div style={{ display: "grid", gap: 10 }}>
            {paginated.length === 0 ? <p style={{ opacity: 0.6, fontSize: 13 }}>No hay registros.</p> : 
            paginated.map(exam => (
                <div key={exam.id} style={{ border: "1px solid #333", borderRadius: 10, padding: 12, background: "#111" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                    <strong style={{ color: "#fff" }}>{new Date(exam.examDate).toLocaleDateString()}</strong>
                    <span style={{ marginLeft: 10, fontSize: 11, padding: "2px 6px", borderRadius: 4, background: exam.consultationId ? "#1e3a8a" : "#064e3b", color: "#ddd" }}>{exam.consultationId ? "Vinculado" : "Independiente"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button onClick={() => onSell && onSell(exam)} style={{ background: "#16a34a", color: "white", border: "none", padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: "0.8em", fontWeight: "bold" }}>🛒 Vender</button>
                    <button onClick={() => handleEdit(exam)} style={{ fontSize: 11, background: "transparent", border: "1px solid #666", color: "#aaa", cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}>Editar</button>
                    <button onClick={() => handleDelete(exam.id)} style={{ fontSize: 11, background: "transparent", border: "none", color: "#666", cursor: "pointer" }}>x</button>
                    </div>
                </div>
                <div style={{ fontSize: "0.9em", color: "#ccc", display: "grid", gap: 4 }}>
                    <div style={{display:"flex", gap:15}}><span><strong>Rx:</strong> OD {exam.refraction?.finalRx?.od?.sph} / {exam.refraction?.finalRx?.od?.cyl} x {exam.refraction?.finalRx?.od?.axis}°</span><span>OI {exam.refraction?.finalRx?.os?.sph} / {exam.refraction?.finalRx?.os?.cyl} x {exam.refraction?.finalRx?.os?.axis}°</span></div>
                    {exam.preliminary?.avsc?.far?.od && <div style={{fontSize:"0.8em", color:"#aaa"}}>AV Entrada: {exam.preliminary.avsc.far.od} (OD) / {exam.preliminary.avsc.far.os} (OS)</div>}
                </div>
                </div>
            ))
            }
          </div>
      )}
      {totalPages > 1 && <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10 }}><button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ background: "#333", color: "white", border: "none", padding: "4px 10px", borderRadius: 4, opacity: page===1?0.5:1 }}>◀</button><span style={{ fontSize: 12, color: "#888", alignSelf:"center" }}>{page} / {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ background: "#333", color: "white", border: "none", padding: "4px 10px", borderRadius: 4, opacity: page===totalPages?0.5:1 }}>▶</button></div>}
    </section>
  );
}