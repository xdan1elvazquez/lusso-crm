import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { getConsultationById, updateConsultation } from "@/services/consultationsStorage";
import { getExamsByConsultation, createEyeExam, deleteEyeExam } from "@/services/eyeExamStorage"; 
import { getAllProducts } from "@/services/inventoryStorage"; 
import RxPicker from "@/components/RxPicker";
import { normalizeRxValue } from "@/utils/rxOptions";
import { validateRx } from "@/utils/validators";

// 📋 LISTA RÁPIDA DE SÍNTOMAS (MOTIVO)
const COMMON_SYMPTOMS = [
  "Mala Visión Lejana", "Mala Visión Próxima", "Cefalea (Dolor Cabeza)", 
  "Ardor", "Lagrimeo", "Comezón", "Dolor Ocular", "Cansancio / Fatiga",
  "Fotofobia (Luz)", "Ojo Rojo", "Secreción", "Cuerpo Extraño", 
  "Golpes / Trauma", "Revisión Rutinaria"
];

// 📝 PLANTILLAS ALICIA (PADECIMIENTO ACTUAL)
const ALICIA_TEMPLATES = {
  "GLAUCOMA": "Padecimiento crónico e insidioso. Refiere disminución progresiva del campo visual periférico en AO. Niega dolor ocular (silente). Antecedentes familiares de Glaucoma: [SI/NO]. Refiere ver halos de colores ocasionalmente. Tratamiento actual: [NINGUNO/GOTAS].",
  "OJO_SECO": "Inicia hace [TIEMPO] con sensación de cuerpo extraño (arenilla), ardor y fluctuación visual en AO. Intensidad moderada que se agrava por las tardes, con uso de pantallas y aire acondicionado. Mejora parcialmente al parpadear o con lubricantes. Niega secreción purulenta.",
  "CONJUNTIVITIS": "Cuadro de inicio agudo ([X] días). Localizado en [OD/OI/AO]. Caracterizado por hiperemia conjuntival (ojo rojo), epífora y secreción [ACUOSA/MUCOSA]. Intensidad leve a moderada. Refiere sensación de cuerpo extraño y prurito. Agrava al tallarse. Niega baja visual profunda.",
  "REFRACTIVO": "Refiere mala visión lejana de inicio gradual y curso estable en AO. Intensidad moderada que interfiere con actividades diarias. Carácter borroso que mejora al entrecerrar los ojos (efecto estenopeico). Se acompaña de astenopía (fatiga) y cefalea frontal vespertina.",
  "CATARATA": "Refiere disminución de la agudeza visual lejana de inicio progresivo e indoloro en [OD/OI/AO]. Carácter de visión nublada o 'a través de un vidrio sucio'. Refiere deslumbramiento (glare) con luces frontales y dificultad para manejo nocturno. No mejora con su corrección actual.",
  "DIABETICA": "Paciente con antecedente de Diabetes Mellitus de [X] años de evolución. Refiere baja visual variable en AO. Niega dolor. Acude para revisión de fondo de ojo. Última glucosa: [VALOR] mg/dL. Control metabólico: [BUENO/MALO]."
};

function toDateInput(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export default function ConsultationDetailPage() {
  const { patientId, consultationId } = useParams();
  const [consultation, setConsultation] = useState(null);
  
  const [form, setForm] = useState({
    visitDate: "", type: "OPHTHALMO",
    reason: "", history: "",
    vitalSigns: { sys: "", dia: "", heartRate: "", temp: "" },
    exam: { adnexa: "", conjunctiva: "", cornea: "", anteriorChamber: "", iris: "", lens: "", vitreous: "", retina: "", motility: "" },
    diagnosis: "", treatment: "", prognosis: "", notes: "",
    prescribedMeds: [] 
  });

  const [exams, setExams] = useState([]);
  const [tick, setTick] = useState(0);
  const [showRxForm, setShowRxForm] = useState(false);
  const [rxForm, setRxForm] = useState(normalizeRxValue());
  const [rxErrors, setRxErrors] = useState({});

  useEffect(() => {
    const c = getConsultationById(consultationId);
    if (c && c.patientId === patientId) {
      setConsultation(c);
      setForm({
        visitDate: toDateInput(c.visitDate || c.createdAt),
        type: c.type || "OPHTHALMO",
        reason: c.reason || "",
        history: c.history || "",
        vitalSigns: { ...c.vitalSigns },
        exam: { ...c.exam },
        diagnosis: c.diagnosis || "",
        treatment: c.treatment || "",
        prognosis: c.prognosis || "",
        notes: c.notes || "",
        prescribedMeds: c.prescribedMeds || [],
      });
    }
  }, [patientId, consultationId]);

  useEffect(() => { if (consultationId) setExams(getExamsByConsultation(consultationId)); }, [consultationId, tick]);

  const onSaveConsultation = () => {
    updateConsultation(consultationId, { ...form, visitDate: form.visitDate || new Date().toISOString() });
    alert("Nota médica guardada correctamente");
  };

  // --- HELPERS DE TEXTO ---
  const toggleSymptom = (symptom) => {
    let current = form.reason ? form.reason.split(", ").map(s => s.trim()).filter(Boolean) : [];
    if (current.includes(symptom)) current = current.filter(s => s !== symptom); 
    else current.push(symptom);
    setForm(f => ({ ...f, reason: current.join(", ") }));
  };

  const applyHistoryTemplate = (e) => {
    const key = e.target.value;
    if (!key) return;
    const template = ALICIA_TEMPLATES[key];
    // Si ya hay texto, preguntamos si sobrescribir o añadir
    if (form.history && !confirm("¿Reemplazar el texto actual con la plantilla?")) {
        // Si dice que no, lo añadimos al final
        setForm(f => ({ ...f, history: f.history + "\n\n" + template }));
    } else {
        // Si dice que sí o está vacío, reemplazamos
        setForm(f => ({ ...f, history: template }));
    }
    e.target.value = ""; // Reset selector
  };

  const handleAddMed = (textLine, medObject) => {
    setForm(prev => ({
      ...prev,
      treatment: (prev.treatment ? prev.treatment + "\n" : "") + textLine,
      prescribedMeds: medObject ? [...prev.prescribedMeds, medObject] : prev.prescribedMeds
    }));
  };

  const removeMedFromList = (index) => {
    setForm(prev => ({ ...prev, prescribedMeds: prev.prescribedMeds.filter((_, i) => i !== index) }));
  };

  const onSaveExam = (e) => {
    e.preventDefault();
    const validation = validateRx(rxForm);
    if (!validation.isValid) { setRxErrors(validation.errors); return; }
    createEyeExam({ patientId, consultationId, examDate: form.visitDate || new Date().toISOString(), rx: rxForm, notes: rxForm.notes });
    setRxForm(normalizeRxValue()); setRxErrors({}); setShowRxForm(false); setTick((t) => t + 1);
  };
  const onDeleteExam = (examId) => { if (confirm("¿Borrar?")) { deleteEyeExam(examId); setTick((t) => t + 1); } };

  const SectionTitle = ({ title }) => (
    <h3 style={{ borderBottom: "1px solid #333", paddingBottom: 8, marginTop: 0, marginBottom: 15, color: "#60a5fa", fontSize: "1.1em", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</h3>
  );

  if (!consultation) return <div style={{padding:40, textAlign:"center"}}>Cargando...</div>;

  return (
    <div style={{ paddingBottom: 80, width: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <Link to={`/patients/${patientId}`} style={{ color: "#aaa", textDecoration: "none" }}>← Volver al paciente</Link>
        <h1 style={{ marginTop: 10 }}>Consulta Oftalmológica</h1>
        <div style={{ color: "#666", fontSize: "0.9em" }}>Folio: {consultation.id.slice(0,8)}</div>
      </div>

      <div style={{ display: "grid", gap: 30, gridTemplateColumns: "1fr" }}>
        <section style={{ background: "#1a1a1a", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
             <label style={{ fontSize: 13, color: "#888" }}>Fecha Atención <input type="date" value={form.visitDate} onChange={(e) => setForm(f => ({ ...f, visitDate: e.target.value }))} style={{ display:"block", marginTop:4, padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} /></label>
             <button onClick={onSaveConsultation} style={{ background: "#2563eb", border: "none", color: "white", padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontWeight: "bold", height: "fit-content", alignSelf: "center" }}>💾 Guardar Nota Médica</button>
          </div>

          <div style={{ display: "grid", gap: 25 }}>
            
            {/* 1. INTERROGATORIO */}
            <div>
              <SectionTitle title="1. Interrogatorio" />
              
              {/* SELECTOR RÁPIDO DE SÍNTOMAS (MOTIVO) */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {COMMON_SYMPTOMS.map(sym => {
                  const isActive = form.reason.includes(sym);
                  return (
                    <button key={sym} onClick={() => toggleSymptom(sym)} style={{ padding: "4px 10px", borderRadius: 20, border: isActive ? "1px solid #4ade80" : "1px solid #444", background: isActive ? "rgba(74, 222, 128, 0.1)" : "transparent", color: isActive ? "#fff" : "#aaa", cursor: "pointer", fontSize: "0.8em", transition: "all 0.2s" }}>
                      {isActive ? "✓ " : "+ "}{sym}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: "grid", gap: 15 }}>
                <label>
                  <span style={{color:"#ccc", fontSize:13}}>Motivo de Consulta</span>
                  <textarea rows={1} value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} style={{ width: "100%", padding: 10, background: "#222", border: "1px solid #444", color: "white", borderRadius: 6, marginTop: 4 }} placeholder="Selecciona síntomas arriba o escribe..." />
                </label>

                {/* PADECIMIENTO ACTUAL CON PLANTILLAS ALICIA */}
                <label>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4}}>
                      <span style={{color:"#ccc", fontSize:13}}>Padecimiento Actual (Historia Clínica)</span>
                      <select onChange={applyHistoryTemplate} style={{ background: "#333", border: "1px solid #555", color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: "0.85em", cursor:"pointer" }}>
                          <option value="">⚡ Cargar Plantilla ALICIA...</option>
                          <option value="REFRACTIVO">Miopía / Astigmatismo</option>
                          <option value="OJO_SECO">Ojo Seco (CDMX)</option>
                          <option value="CONJUNTIVITIS">Conjuntivitis</option>
                          <option value="GLAUCOMA">Glaucoma</option>
                          <option value="CATARATA">Catarata</option>
                          <option value="DIABETICA">Retinopatía Diabética</option>
                      </select>
                  </div>
                  <textarea 
                     rows={5} 
                     value={form.history} 
                     onChange={(e) => setForm(f => ({ ...f, history: e.target.value }))} 
                     style={{ width: "100%", padding: 12, background: "#222", border: "1px solid #444", color: "#ddd", borderRadius: 6, lineHeight: "1.5" }} 
                     placeholder="Describa la evolución del padecimiento..." 
                  />
                </label>
              </div>
            </div>

            {/* 2. SIGNOS VITALES */}
            <div>
              <SectionTitle title="2. Signos Vitales" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                 <label><span style={{color:"#888", fontSize:11}}>TA Sistólica</span><input type="number" placeholder="120" value={form.vitalSigns.sys} onChange={e => setForm(f => ({...f, vitalSigns: {...f.vitalSigns, sys: e.target.value}}))} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} /></label>
                 <label><span style={{color:"#888", fontSize:11}}>TA Diastólica</span><input type="number" placeholder="80" value={form.vitalSigns.dia} onChange={e => setForm(f => ({...f, vitalSigns: {...f.vitalSigns, dia: e.target.value}}))} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} /></label>
                 <label><span style={{color:"#888", fontSize:11}}>F. Cardiaca</span><input type="number" placeholder="Lat/min" value={form.vitalSigns.heartRate} onChange={e => setForm(f => ({...f, vitalSigns: {...f.vitalSigns, heartRate: e.target.value}}))} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} /></label>
                 <label><span style={{color:"#888", fontSize:11}}>Temp (°C)</span><input type="number" placeholder="36.5" value={form.vitalSigns.temp} onChange={e => setForm(f => ({...f, vitalSigns: {...f.vitalSigns, temp: e.target.value}}))} style={{width:"100%", padding:8, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} /></label>
              </div>
            </div>

            {/* 3. EXPLORACIÓN */}
            <div>
              <SectionTitle title="3. Exploración Oftalmológica" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                 <div style={{ display: "grid", gap: 10 }}>
                    <h4 style={{margin:0, color:"#4ade80", fontSize:"0.9em"}}>Segmento Anterior</h4>
                    <label><span style={{color:"#888", fontSize:11}}>Anexos</span><input value={form.exam.adnexa} onChange={e => setForm(f => ({...f, exam: {...f.exam, adnexa: e.target.value}}))} style={{width:"100%", padding:6, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} /></label>
                    <label><span style={{color:"#888", fontSize:11}}>Conjuntiva</span><input value={form.exam.conjunctiva} onChange={e => setForm(f => ({...f, exam: {...f.exam, conjunctiva: e.target.value}}))} style={{width:"100%", padding:6, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} /></label>
                    <label><span style={{color:"#888", fontSize:11}}>Córnea</span><input value={form.exam.cornea} onChange={e => setForm(f => ({...f, exam: {...f.exam, cornea: e.target.value}}))} style={{width:"100%", padding:6, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} /></label>
                    <label><span style={{color:"#888", fontSize:11}}>Cámara/Iris</span><input value={form.exam.anteriorChamber} onChange={e => setForm(f => ({...f, exam: {...f.exam, anteriorChamber: e.target.value}}))} style={{width:"100%", padding:6, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} /></label>
                    <label><span style={{color:"#888", fontSize:11}}>Cristalino</span><input value={form.exam.lens} onChange={e => setForm(f => ({...f, exam: {...f.exam, lens: e.target.value}}))} style={{width:"100%", padding:6, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} /></label>
                 </div>
                 <div style={{ display: "grid", gap: 10 }}>
                    <h4 style={{margin:0, color:"#f472b6", fontSize:"0.9em"}}>Fondo de Ojo y Motor</h4>
                    <label><span style={{color:"#888", fontSize:11}}>Vítreo</span><input value={form.exam.vitreous} onChange={e => setForm(f => ({...f, exam: {...f.exam, vitreous: e.target.value}}))} style={{width:"100%", padding:6, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} /></label>
                    <label><span style={{color:"#888", fontSize:11}}>Retina/Nervio</span><textarea rows={3} value={form.exam.retina} onChange={e => setForm(f => ({...f, exam: {...f.exam, retina: e.target.value}}))} style={{width:"100%", padding:6, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} placeholder="Excavación, mácula..." /></label>
                    <label><span style={{color:"#888", fontSize:11}}>Motilidad</span><input value={form.exam.motility} onChange={e => setForm(f => ({...f, exam: {...f.exam, motility: e.target.value}}))} style={{width:"100%", padding:6, background:"#222", border:"1px solid #444", color:"white", borderRadius:4}} placeholder="Ortotropia..." /></label>
                 </div>
              </div>
            </div>

            {/* 4. DIAGNÓSTICO Y PLAN */}
            <div>
              <SectionTitle title="4. Diagnóstico y Plan" />
              <div style={{ display: "grid", gap: 15 }}>
                <label><span style={{color:"#ccc", fontSize:13}}>Diagnóstico</span><input value={form.diagnosis} onChange={(e) => setForm(f => ({ ...f, diagnosis: e.target.value }))} style={{ width: "100%", padding: 10, background: "#222", border: "1px solid #444", color: "white", borderRadius: 6, marginTop: 4 }} /></label>
                <PrescriptionBuilder onAdd={handleAddMed} />
                {form.prescribedMeds.length > 0 && (
                  <div style={{ padding: 10, background: "#222", borderRadius: 6, border: "1px solid #444" }}>
                    <div style={{ fontSize: 12, color: "#aaa", marginBottom: 5 }}>Meds vinculados:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {form.prescribedMeds.map((m, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "#333", padding: "4px 8px", borderRadius: 4, fontSize: 12 }}>
                          <span>💊 {m.productName} ({m.qty})</span>
                          <button onClick={() => removeMedFromList(i)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 10 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <label><span style={{color:"#ccc", fontSize:13}}>Plan / Receta</span><textarea rows={6} value={form.treatment} onChange={(e) => setForm(f => ({ ...f, treatment: e.target.value }))} style={{ width: "100%", padding: 10, background: "#222", border: "1px solid #444", color: "white", borderRadius: 6, marginTop: 4, fontFamily: "monospace" }} /></label>
                <label><span style={{color:"#ccc", fontSize:13}}>Pronóstico</span><input value={form.prognosis} onChange={(e) => setForm(f => ({ ...f, prognosis: e.target.value }))} style={{ width: "100%", padding: 10, background: "#222", border: "1px solid #444", color: "white", borderRadius: 6, marginTop: 4 }} placeholder="Bueno para la vida y función" /></label>
              </div>
            </div>

          </div>
        </section>

        <section style={{ background: "#111", padding: 20, borderRadius: 12, border: "1px dashed #444" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <h3 style={{ margin: 0, color: "#aaa" }}>Anexo: Refracción</h3>
            {!showRxForm && <button onClick={() => setShowRxForm(true)} style={{ background: "#333", color: "white", border: "1px solid #555", padding: "6px 12px", borderRadius: 4, cursor:"pointer" }}>+ Agregar Rx</button>}
          </div>
          <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
            {exams.length === 0 && !showRxForm && <p style={{ color: "#666", fontStyle: "italic", fontSize: "0.9em" }}>Sin datos refractivos.</p>}
            {exams.map((exam) => (
              <div key={exam.id} style={{ background: "#222", padding: 10, borderRadius: 6, borderLeft: "3px solid #60a5fa", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{fontSize:"0.9em"}}><div>OD: {exam.rx.od.sph} / {exam.rx.od.cyl} x {exam.rx.od.axis}°</div><div>OI: {exam.rx.os.sph} / {exam.rx.os.cyl} x {exam.rx.os.axis}°</div></div>
                <button onClick={() => onDeleteExam(exam.id)} style={{ fontSize: 11, background: "transparent", border: "none", color: "#666", cursor:"pointer" }}>Borrar</button>
              </div>
            ))}
          </div>
          {showRxForm && (
            <div style={{ background: "#1f1f1f", padding: 15, borderRadius: 8, border: "1px solid #60a5fa" }}>
              <RxPicker value={rxForm} onChange={setRxForm} />
              <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
                <button onClick={onSaveExam} style={{ background: "#60a5fa", color: "black", border: "none", padding: "8px 16px", borderRadius:4, cursor:"pointer", fontWeight:"bold" }}>Guardar Rx</button>
                <button onClick={() => setShowRxForm(false)} style={{ background: "transparent", border: "none", color: "#aaa", cursor:"pointer" }}>Cancelar</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTE: CONSTRUCTOR DE RECETAS ---
function PrescriptionBuilder({ onAdd }) {
  const [query, setQuery] = useState("");
  const [selectedMed, setSelectedMed] = useState(null); 
  const [manualName, setManualName] = useState("");
  const [type, setType] = useState("DROPS"); 
  const [dose, setDose] = useState("1"); 
  const [freq, setFreq] = useState("8"); 
  const [duration, setDuration] = useState("7"); 
  const [eye, setEye] = useState("AO"); 

  const products = useMemo(() => getAllProducts().filter(p => p.category === "MEDICATION"), []);
  const filteredMeds = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return products.filter(p => p.brand.toLowerCase().includes(q) || p.model.toLowerCase().includes(q)).slice(0, 5);
  }, [products, query]);

  const handleSelectMed = (prod) => {
    setSelectedMed(prod); setManualName(`${prod.brand} ${prod.model}`); setQuery("");
    if (prod.tags?.presentation) setType(prod.tags.presentation);
  };

  const generateLine = () => {
    const name = selectedMed ? `${selectedMed.brand} ${selectedMed.model}` : manualName;
    if (!name) return;
    let instruction = "";
    if (type === "DROPS") instruction = `Aplicar ${dose} gota(s) en ${eye} cada ${freq} hrs por ${duration} días.`;
    else if (type === "OINTMENT") instruction = `Aplicar ${dose} cm en fondo de saco ${eye} cada ${freq} hrs por ${duration} días.`;
    else if (type === "ORAL") instruction = `Tomar ${dose} (tab/cap) cada ${freq} hrs por ${duration} días.`;
    else instruction = `Aplicar cada ${freq} hrs por ${duration} días.`;

    const medObject = selectedMed ? { productId: selectedMed.id, productName: `${selectedMed.brand} ${selectedMed.model}`, qty: 1, price: selectedMed.price, instructions: instruction } : null;
    onAdd(`• ${name}: ${instruction}`, medObject);
    setManualName(""); setSelectedMed(null);
  };

  return (
    <div style={{ background: "#222", border: "1px solid #444", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: "bold", marginBottom: 8 }}>⚡ Agregar Medicamento Rápido</div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input placeholder="Buscar en farmacia o escribir nombre..." value={selectedMed ? `${selectedMed.brand} ${selectedMed.model}` : manualName || query} onChange={e => { setQuery(e.target.value); setManualName(e.target.value); setSelectedMed(null); }} style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #555", background: "#333", color: "white" }} />
        {selectedMed && <span style={{ position: "absolute", right: 10, top: 8, fontSize: 11, color: Number(selectedMed.stock) > 0 ? "#4ade80" : "#f87171", fontWeight: "bold" }}>{Number(selectedMed.stock) > 0 ? `✅ Stock: ${selectedMed.stock}` : `⚠️ Stock: 0`}</span>}
        {query && filteredMeds.length > 0 && !selectedMed && (
           <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#333", border: "1px solid #555", zIndex: 10, maxHeight: 150, overflowY: "auto" }}>
              {filteredMeds.map(p => (
                 <div key={p.id} onClick={() => handleSelectMed(p)} style={{ padding: 8, borderBottom: "1px solid #444", cursor: "pointer", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                    <div>{p.brand} {p.model}</div>
                    <div style={{ fontSize: 11, color: Number(p.stock) > 0 ? "#4ade80" : "#f87171", fontWeight: "bold" }}>{Number(p.stock) > 0 ? `Stock: ${p.stock}` : "Agotado"}</div>
                 </div>
              ))}
           </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
         <label style={{fontSize:11, color:"#aaa"}}>Tipo<select value={type} onChange={e => setType(e.target.value)} style={{display:"block", padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}}><option value="DROPS">Gotas</option><option value="OINTMENT">Ungüento</option><option value="ORAL">Oral</option><option value="OTHER">Otro</option></select></label>
         {(type === "DROPS" || type === "OINTMENT") && <label style={{fontSize:11, color:"#aaa"}}>Ojo<select value={eye} onChange={e => setEye(e.target.value)} style={{display:"block", padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}}><option value="AO">AO</option><option value="OD">OD</option><option value="OI">OI</option></select></label>}
         <label style={{fontSize:11, color:"#aaa"}}>Cant<input value={dose} onChange={e => setDose(e.target.value)} style={{display:"block", width:40, padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}} /></label>
         <span style={{paddingBottom:8, fontSize:12, color:"#888"}}>cada</span>
         <label style={{fontSize:11, color:"#aaa"}}>Hrs<input value={freq} onChange={e => setFreq(e.target.value)} style={{display:"block", width:40, padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}} /></label>
         <span style={{paddingBottom:8, fontSize:12, color:"#888"}}>por</span>
         <label style={{fontSize:11, color:"#aaa"}}>Días<input value={duration} onChange={e => setDuration(e.target.value)} style={{display:"block", width:40, padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}} /></label>
         <button onClick={(e) => { e.preventDefault(); generateLine(); }} style={{ marginBottom: 1, padding: "6px 12px", background: "#4ade80", color: "#000", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>+ Agregar</button>
      </div>
    </div>
  );
}