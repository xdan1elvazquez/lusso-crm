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

export default function EyeExamsPanel({ patientId, onSell }) {
  const [tick, setTick] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  
  // --- ESTADOS DEL FORMULARIO ---
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  
  // Sección 1: Preliminares
  const [prelim, setPrelim] = useState({
    avsc: { od: "", oi: "" },
    avcc: { od: "", oi: "" },
    autorefrac: { od: "", oi: "" },
    ishihara: "",
    iop: { od: "", oi: "" }
  });

  // Sección 2: Rx Final
  const [rx, setRx] = useState(normalizeRxValue());

  // Sección 3: Recomendaciones
  const [recs, setRecs] = useState({ design: "", material: "", coating: "", usage: "" });

  // Sección 4: Contact Lens
  const [cl, setCl] = useState({
    design: "", brand: "",
    od: { baseCurve: "", diameter: "", power: "" },
    oi: { baseCurve: "", diameter: "", power: "" }
  });

  const [errors, setErrors] = useState({});

  const exams = useMemo(() => getExamsByPatient(patientId), [patientId, tick]);

  const handleCreate = (e) => {
    e.preventDefault();
    
    // Validamos solo la Rx final
    const validation = validateRx(rx);
    if (!validation.isValid) {
      setErrors(validation.errors);
      alert("Error en la graduación final. Revisa los campos.");
      return;
    }

    createEyeExam({
      patientId,
      consultationId: null, // Independiente
      examDate: formDate,
      preliminary: {
        avsc: prelim.avsc,
        avcc: prelim.avcc,
        autorefrac: prelim.autorefrac,
        lensometry: null
      },
      triage: {
        iop: prelim.iop,
        ishihara: prelim.ishihara
      },
      rx: rx,
      recommendations: recs,
      contactLens: cl,
      notes: notes
    });

    // Reset total
    setRx(normalizeRxValue());
    setNotes("");
    setRecs({ design: "", material: "", coating: "", usage: "" });
    setPrelim({ avsc: { od: "", oi: "" }, avcc: { od: "", oi: "" }, autorefrac: { od: "", oi: "" }, ishihara: "", iop: { od: "", oi: "" } });
    setCl({ design: "", brand: "", od: { baseCurve: "", diameter: "", power: "" }, oi: { baseCurve: "", diameter: "", power: "" } });
    setErrors({});
    setIsCreating(false);
    setTick(t => t + 1);
  };

  const handleDelete = (id) => {
    if(confirm("¿Eliminar este examen?")) {
      deleteEyeExam(id);
      setTick(t => t + 1);
    }
  };

  return (
    <section style={{ marginTop: 28, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Historial Optométrico</h2>
        <button onClick={() => setIsCreating(!isCreating)} style={{ fontSize: "0.9em", background: isCreating ? "#333" : "#2563eb", color: "white", border: "none", padding: "8px 12px", borderRadius: 6, cursor: "pointer" }}>
          {isCreating ? "Cerrar Formulario" : "+ Nuevo Examen"}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333", display: "grid", gap: 20 }}>
          
          <div style={{ display: "flex", gap: 20, borderBottom: "1px solid #333", paddingBottom: 15 }}>
             <label>
                <span style={{color:"#aaa", fontSize:13}}>Fecha del Examen</span>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={{ display:"block", background: "#222", border: "1px solid #444", color: "white", padding: 6, borderRadius: 4, marginTop:4 }} />
             </label>
          </div>

          {/* --- SECCIÓN 1: PRELIMINARES --- */}
          <div style={{ background: "#111", padding: 15, borderRadius: 8 }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#60a5fa" }}>1. Preliminares & Salud Ocular</h4>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 15 }}>
              <div>
                <strong style={{fontSize:12, color:"#ddd"}}>Agudeza Visual (SC)</strong>
                <div style={{display:"flex", gap:8, marginTop:4}}>
                  <SmallInput label="OD" placeholder="20/..." value={prelim.avsc.od} onChange={v => setPrelim({...prelim, avsc: {...prelim.avsc, od: v}})} />
                  <SmallInput label="OI" placeholder="20/..." value={prelim.avsc.oi} onChange={v => setPrelim({...prelim, avsc: {...prelim.avsc, oi: v}})} />
                </div>
              </div>

              <div>
                <strong style={{fontSize:12, color:"#ddd"}}>PIO (Tonometría)</strong>
                <div style={{display:"flex", gap:8, marginTop:4}}>
                  <SmallInput label="OD mmHG" placeholder="10" value={prelim.iop.od} onChange={v => setPrelim({...prelim, iop: {...prelim.iop, od: v}})} />
                  <SmallInput label="OI mmHG" placeholder="10" value={prelim.iop.oi} onChange={v => setPrelim({...prelim, iop: {...prelim.iop, oi: v}})} />
                </div>
              </div>

              <div>
                <strong style={{fontSize:12, color:"#ddd"}}>Test de Color</strong>
                <div style={{marginTop:4}}>
                   <input 
                      placeholder="Ishihara (ej. Normal)" 
                      value={prelim.ishihara} 
                      onChange={e => setPrelim({...prelim, ishihara: e.target.value})}
                      style={{ width: "100%", background: "#222", border: "1px solid #444", color: "white", padding: 6, borderRadius: 4 }}
                   />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
                <strong style={{fontSize:12, color:"#ddd"}}>Autorrefractómetro (Referencia)</strong>
                <div style={{display:"flex", gap:15, marginTop:4}}>
                   <input placeholder="OD: Esfera / Cil / Eje" value={prelim.autorefrac.od} onChange={e => setPrelim({...prelim, autorefrac: {...prelim.autorefrac, od: e.target.value}})} style={{ flex:1, background: "#222", border: "1px solid #444", color: "white", padding: 6, borderRadius: 4 }} />
                   <input placeholder="OI: Esfera / Cil / Eje" value={prelim.autorefrac.oi} onChange={e => setPrelim({...prelim, autorefrac: {...prelim.autorefrac, oi: e.target.value}})} style={{ flex:1, background: "#222", border: "1px solid #444", color: "white", padding: 6, borderRadius: 4 }} />
                </div>
            </div>
          </div>

          {/* --- SECCIÓN 2: REFRACCIÓN --- */}
          <div style={{ background: "#111", padding: 15, borderRadius: 8, border: "1px solid #444" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#4ade80" }}>2. Refracción Final (Receta)</h4>
            <RxPicker value={rx} onChange={setRx} />
          </div>

          {/* --- SECCIÓN 3: RECOMENDACIÓN --- */}
          <div style={{ background: "#2e1065", padding: 15, borderRadius: 8, border: "1px solid #5b21b6" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#c4b5fd" }}>💡 Recomendación para Ventas</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
               <SmallInput width="100%" label="Diseño Sugerido" placeholder="Ej. Progresivo Digital" value={recs.design} onChange={v => setRecs({...recs, design: v})} />
               <SmallInput width="100%" label="Material" placeholder="Ej. Alto Índice 1.67" value={recs.material} onChange={v => setRecs({...recs, material: v})} />
               <SmallInput width="100%" label="Tratamiento" placeholder="Ej. Blue Free" value={recs.coating} onChange={v => setRecs({...recs, coating: v})} />
               <SmallInput width="100%" label="Uso Principal" placeholder="Ej. Permanente / PC" value={recs.usage} onChange={v => setRecs({...recs, usage: v})} />
            </div>
          </div>

          {/* --- SECCIÓN 4: LENTES DE CONTACTO --- */}
          <div style={{ background: "#111", padding: 15, borderRadius: 8 }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#f472b6" }}>4. Lentes de Contacto (Opcional)</h4>
            
            <div style={{display:"flex", gap:10, marginBottom: 10}}>
               <SmallInput label="Marca/Material" width="100%" placeholder="Ej. Biofinity" value={cl.brand} onChange={v => setCl({...cl, brand: v})} />
               <SmallInput label="Diseño" width="100%" placeholder="Ej. Tórico" value={cl.design} onChange={v => setCl({...cl, design: v})} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
               <div style={{ borderTop: "1px solid #333", paddingTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>OD (Lente Contacto)</div>
                  <div style={{ display: "flex", gap: 6 }}>
                     <SmallInput label="Radio (KB)" placeholder="8.6" value={cl.od.baseCurve} onChange={v => setCl({...cl, od: {...cl.od, baseCurve: v}})} />
                     <SmallInput label="Diám" placeholder="14.0" value={cl.od.diameter} onChange={v => setCl({...cl, od: {...cl.od, diameter: v}})} />
                     <SmallInput label="Poder" placeholder="-2.00" width="80px" value={cl.od.power} onChange={v => setCl({...cl, od: {...cl.od, power: v}})} />
                  </div>
               </div>
               <div style={{ borderTop: "1px solid #333", paddingTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>OI (Lente Contacto)</div>
                  <div style={{ display: "flex", gap: 6 }}>
                     <SmallInput label="Radio (KB)" placeholder="8.6" value={cl.oi.baseCurve} onChange={v => setCl({...cl, oi: {...cl.oi, baseCurve: v}})} />
                     <SmallInput label="Diám" placeholder="14.0" value={cl.oi.diameter} onChange={v => setCl({...cl, oi: {...cl.oi, diameter: v}})} />
                     <SmallInput label="Poder" placeholder="-2.00" width="80px" value={cl.oi.power} onChange={v => setCl({...cl, oi: {...cl.oi, power: v}})} />
                  </div>
               </div>
            </div>
          </div>

          <textarea 
            placeholder="Notas generales, recomendaciones o diagnósticos adicionales..." 
            rows={3} 
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ width: "100%", background: "#222", border: "1px solid #444", color: "white", padding: 10, borderRadius: 6 }}
          />

          <button type="submit" style={{ padding: "12px", background: "#4ade80", color: "black", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}>
            Guardar Examen Completo
          </button>
        </form>
      )}

      {/* --- LISTADO (VISUALIZACIÓN) --- */}
      <div style={{ display: "grid", gap: 10 }}>
        {exams.length === 0 && <p style={{opacity:0.5}}>Sin registros.</p>}
        {exams.map(exam => (
          <div key={exam.id} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 16, background: "#111" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, borderBottom: "1px solid #222", paddingBottom: 8 }}>
              <div>
                <strong style={{ color: "#fff", fontSize: "1.1em" }}>{new Date(exam.examDate).toLocaleDateString()}</strong>
                <span style={{ marginLeft: 10, fontSize: 11, padding: "2px 6px", borderRadius: 4, background: exam.consultationId ? "#1e3a8a" : "#064e3b", color: "#ddd" }}>
                  {exam.consultationId ? "Médico (Vinculado)" : "Independiente"}
                </span>
                {exam.recommendations?.design && <span style={{ marginLeft: 8, fontSize:11, background:"#5b21b6", padding:"2px 6px", borderRadius:4, color:"#ddd"}}>Rec: {exam.recommendations.design}</span>}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button 
                    onClick={() => onSell && onSell(exam)} 
                    style={{ background: "#16a34a", color: "white", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: "0.9em", fontWeight: "bold" }}
                  >
                    🛒 Vender
                  </button>
                  {exam.consultationId && (
                    <Link to={`/patients/${patientId}/consultations/${exam.consultationId}`} style={{ fontSize: 12, color: "#60a5fa" }}>
                      Ver Consulta ↗
                    </Link>
                  )}
                  <button onClick={() => handleDelete(exam.id)} style={{ padding: "2px 6px", fontSize: 11, background: "transparent", border: "1px solid #444", color: "#888" }}>
                    Eliminar
                  </button>
              </div>
            </div>

            {/* Grid de Resumen */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, fontSize: "0.9em" }}>
               
               {/* 1. Datos Rx */}
               <div>
                  <div style={{ color: "#4ade80", fontWeight: "bold", marginBottom: 4 }}>Rx Final</div>
                  <div>OD: {exam.rx.od.sph} / {exam.rx.od.cyl} x {exam.rx.od.axis}°</div>
                  <div>OI: {exam.rx.os.sph} / {exam.rx.os.cyl} x {exam.rx.os.axis}°</div>
                  {exam.rx.pd?.distance && <div style={{fontSize:11, color:"#888"}}>DP: {exam.rx.pd.distance} mm</div>}
               </div>

               {/* 2. Datos Preliminares */}
               {(exam.preliminary?.avsc?.od || exam.triage?.iop?.od) && (
                 <div>
                    <div style={{ color: "#60a5fa", fontWeight: "bold", marginBottom: 4 }}>Preliminares</div>
                    {exam.preliminary?.avsc?.od && <div>AV SC: {exam.preliminary.avsc.od} | {exam.preliminary.avsc.oi}</div>}
                    {exam.triage?.iop?.od && <div>PIO: {exam.triage.iop.od} | {exam.triage.iop.oi} mmHg</div>}
                    {exam.triage?.ishihara && <div>Color: {exam.triage.ishihara}</div>}
                 </div>
               )}

               {/* 3. Lentes de Contacto */}
               {(exam.contactLens?.brand || exam.contactLens?.od?.baseCurve) && (
                 <div>
                    <div style={{ color: "#f472b6", fontWeight: "bold", marginBottom: 4 }}>Lentes de Contacto</div>
                    {exam.contactLens.brand && <div>{exam.contactLens.brand} ({exam.contactLens.design})</div>}
                    <div>OD: {exam.contactLens.od.power || "-"} (KB {exam.contactLens.od.baseCurve})</div>
                 </div>
               )}
            </div>
            
            {exam.notes && <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px solid #222", fontSize: 13, color: "#aaa", fontStyle: "italic" }}>"{exam.notes}"</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

// ✅ AQUÍ ESTÁ EL TRUCO: Definir el componente FUERA de la función principal
function SmallInput({ label, value, onChange, placeholder, width = "60px" }) {
  return (
    <label style={{ display: "block", fontSize: 12 }}>
      <div style={{color:"#888", marginBottom: 2}}>{label}</div>
      <input 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        placeholder={placeholder}
        style={{ width, background: "#222", border: "1px solid #444", color: "white", padding: 4, borderRadius: 4 }}
      />
    </label>
  );
}