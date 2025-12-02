import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { getConsultationById, updateConsultation } from "@/services/consultationsStorage";
import { getExamsByConsultation, createEyeExam, deleteEyeExam } from "@/services/eyeExamStorage"; 
import { getAllProducts } from "@/services/inventoryStorage"; 
import { getPatientById } from "@/services/patientsStorage"; 
import RxPicker from "@/components/RxPicker";
import { normalizeRxValue } from "@/utils/rxOptions";
import { validateRx } from "@/utils/validators";

// --- CONFIGURACIÓN DE SISTEMAS (IPAS) ---
const SYSTEMS_CONFIG = [
  { id: "endocrine", label: "Endocrino (Diabetes)", options: ["Poliuria", "Polidipsia", "Pérdida de Peso", "Intolerancia al calor/frío"] },
  { id: "cardiovascular", label: "Cardiovascular (HTA)", options: ["Dolor Torácico", "Disnea", "Ortopnea", "Edema", "Palpitaciones"] },
  { id: "respiratory", label: "Respiratorio", options: ["Tos", "Expectoración", "Disnea", "Sibilancias"] },
  { id: "digestive", label: "Digestivo", options: ["Disfagia", "Pirosis", "Dolor Abdominal", "Náusea/Vómito", "Cambios hábito intestinal"] },
  { id: "nervous", label: "Nervioso", options: ["Cefalea", "Mareo", "Pérdida de conciencia", "Alteraciones marcha", "Parestesias"] },
  { id: "musculoskeletal", label: "Musculoesquelético", options: ["Artralgias", "Mialgias", "Rigidez matutina", "Limitación movimiento"] },
  { id: "genitourinary", label: "Genitourinario", options: ["Disuria", "Hematuria", "Polaquiuria", "Incontinencia"] },
  { id: "skin", label: "Piel y Tegumentos", options: ["Rash", "Prurito", "Cambios coloración", "Lesiones"] },
  { id: "psychiatric", label: "Psiquiátrico", options: ["Ansiedad", "Depresión", "Insomnio", "Alteraciones memoria"] },
  { id: "hemolymphatic", label: "Hemolinfático", options: ["Palidez", "Sangrado fácil", "Adenopatías"] }
];

const getEmptySystems = () => {
    const state = {};
    SYSTEMS_CONFIG.forEach(s => {
        state[s.id] = { isNormal: true, selected: [], details: "" };
    });
    return state;
};

// --- DATOS RÁPIDOS (CHIPS) ---
const QUICK_DATA = {
  symptoms: ["Mala Visión Lejana", "Mala Visión Próxima", "Cefalea", "Ardor", "Lagrimeo", "Comezón", "Dolor Ocular", "Fotofobia", "Ojo Rojo", "Secreción", "Cuerpo Extraño", "Revisión Rutina"],
  anterior: {
    lids: ["Normales", "Blefaritis", "Meibomitis", "Chalazion", "Orzuelo", "Ptosis", "Ectropion", "Entropion"],
    conjunctiva: ["Clara", "Hiperemia Leve", "Hiperemia Mod/Sev", "Quemosis", "Pterigión I", "Pterigión II/III", "Pinguecula", "Folículos", "Papilas"],
    cornea: ["Transparente", "QPS", "Úlcera", "Leucoma", "Queratocono", "Edema", "Pannus"],
    chamber: ["Formada", "Estrecha", "Tyndall (+)", "Hipopion", "Hifema"],
    iris: ["Normal", "Sinequias", "Atrofia", "Rubeosis"],
    lens: ["Transparente", "Facosclerosis", "Cat. Nuclear", "Cat. Cortical", "Cat. Subcapsular", "LIO Centrado"]
  },
  posterior: {
    vitreous: ["Transparente", "DVP", "Miodesopsias", "Hemorragia"],
    nerve: ["Bordes Netos", "Excavación 0.3", "Excavación 0.5", "Excavación 0.8", "Palidez"],
    macula: ["Brillo Foveal", "Drusas", "Edema", "EPR Alterado"],
    vessels: ["Normales", "Tortuosidad", "Cruces A/V", "Hemorragias", "Exudados"],
    retinaPeriphery: ["Aplicada", "Desgarro", "Agujero", "Desprendimiento"]
  }
};

const SEGMENTS_ANTERIOR = [
  { key: "lids", label: "Párpados y Anexos" },
  { key: "conjunctiva", label: "Conjuntiva" },
  { key: "cornea", label: "Córnea" },
  { key: "chamber", label: "Cámara Anterior" },
  { key: "iris", label: "Iris y Pupila" },
  { key: "lens", label: "Cristalino" }
];

const SEGMENTS_POSTERIOR = [
  { key: "vitreous", label: "Vítreo" },
  { key: "nerve", label: "Nervio Óptico (Papila)" },
  { key: "macula", label: "Mácula" },
  { key: "vessels", label: "Vasos y Arcadas" },
  { key: "retinaPeriphery", label: "Retina Periférica" }
];

const ALICIA_TEMPLATES = {
  "GLAUCOMA": "Padecimiento crónico. Disminución campo visual. AHF Glaucoma: [SI/NO]. Tx: [GOTAS].",
  "OJO_SECO": "Sensación cuerpo extraño y ardor AO. Empeora tardes. Mejora lubricantes.",
  "CONJUNTIVITIS": "Inicio agudo. Ojo rojo, secreción. Niega baja visual.",
  "REFRACTIVO": "Mala visión lejana gradual. Mejora con estenopeico. Cefalea.",
  "CATARATA": "Baja visual progresiva indolora. Deslumbramiento nocturno.",
  "DIABETICA": "DM [X] años. Baja visual variable. Fondo de ojo."
};

function toDateInput(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

const labelStyle = { color: "#ccc", fontSize: 13, display: "block", marginBottom: 4 };
const inputStyle = { width: "100%", padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 };
const textareaStyle = { ...inputStyle, resize: "vertical" };

const QuickChip = ({ label, active, onClick }) => (
  <button type="button" onClick={onClick} style={{ padding: "4px 10px", borderRadius: 20, border: active ? "1px solid #4ade80" : "1px solid #444", background: active ? "rgba(74, 222, 128, 0.1)" : "transparent", color: active ? "#fff" : "#aaa", cursor: "pointer", fontSize: "0.8em", transition: "all 0.2s" }}>
    {active ? "✓ " : "+ "}{label}
  </button>
);

// --- COMPONENTE INTERNO: ACORDEÓN DE SISTEMAS ---
const SystemAccordion = ({ config, data, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Auto-abrir si es crítico o anormal
    useEffect(() => {
        if (config.id === "endocrine" || config.id === "cardiovascular" || !data.isNormal) {
            setIsOpen(true);
        }
    }, []);

    const toggleOption = (opt) => {
        const currentSelected = data.selected || [];
        const newSelected = currentSelected.includes(opt) 
            ? currentSelected.filter(s => s !== opt)
            : [...currentSelected, opt];
        
        onChange({ ...data, isNormal: false, selected: newSelected });
    };

    const handleDetails = (text) => {
        onChange({ ...data, isNormal: false, details: text });
    };

    const setNormal = (e) => {
        e.stopPropagation();
        onChange({ isNormal: true, selected: [], details: "" });
    };

    return (
        <div style={{ marginBottom: 8, border: "1px solid #444", borderRadius: 6, overflow: "hidden" }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    padding: "8px 12px", background: "#222", cursor: "pointer", 
                    display: "flex", justifyContent: "space-between", alignItems: "center" 
                }}
            >
                <div style={{ fontWeight: "bold", color: data.isNormal ? "#aaa" : "#fbbf24", fontSize: "0.95em" }}>
                    {config.label}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: data.isNormal ? "#064e3b" : "#450a0a", color: data.isNormal ? "#4ade80" : "#f87171", fontWeight: "bold" }}>
                        {data.isNormal ? "NEGADO" : "ANORMAL"}
                    </span>
                    <span style={{ fontSize: 10, color: "#666" }}>{isOpen ? "▲" : "▼"}</span>
                </div>
            </div>

            {isOpen && (
                <div style={{ padding: 12, background: "#1a1a1a", borderTop: "1px solid #333" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        {config.options.map(opt => (
                            <button 
                                key={opt} 
                                type="button" 
                                onClick={() => toggleOption(opt)}
                                style={{
                                    fontSize: 11, padding: "4px 8px", borderRadius: 12, border: "1px solid", cursor: "pointer",
                                    background: data.selected?.includes(opt) ? "rgba(251, 191, 36, 0.1)" : "transparent",
                                    borderColor: data.selected?.includes(opt) ? "#fbbf24" : "#444",
                                    color: data.selected?.includes(opt) ? "#fbbf24" : "#888"
                                }}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                    <textarea 
                        rows={2} 
                        placeholder={`Detalles para ${config.label}...`} 
                        value={data.details} 
                        onChange={e => handleDetails(e.target.value)}
                        style={{ ...textareaStyle, fontSize: "0.9em" }}
                    />
                    {!data.isNormal && (
                        <button type="button" onClick={setNormal} style={{ marginTop: 8, fontSize: 11, color: "#4ade80", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                            Marcar como Negado / Normal
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const EyeColumn = ({ eyeLabel, value, onChange, onChipClick, onFileClick, options }) => (
    <div style={{flex:1}}>
        <div style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
            <div style={{fontWeight:"bold", color: eyeLabel==="OD"?"#60a5fa":"#4ade80"}}>{eyeLabel}</div>
            <button type="button" onClick={onFileClick} style={{fontSize:16, cursor:"pointer", background:"none", border:"none"}} title="Adjuntar Foto/PDF">📎</button>
        </div>
        <textarea rows={2} value={value} onChange={e => onChange(e.target.value)} style={textareaStyle} placeholder={`Detalles ${eyeLabel}...`} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {options && options.map(opt => (
                <button key={opt} type="button" onClick={() => onChipClick(opt)} style={{fontSize:"0.75em", padding:"2px 8px", background:"#333", border:"1px solid #444", color:"#ccc", borderRadius:10, cursor:"pointer"}}>
                    + {opt}
                </button>
            ))}
         </div>
    </div>
);

const ODOSEditor = ({ title, dataOD, dataOS, options, onUpdate, onAddFile }) => {
    const appendText = (eye, text) => {
        const current = eye === 'od' ? dataOD : dataOS;
        const newValue = current ? `${current}, ${text}` : text;
        onUpdate(eye, newValue);
    };

    const handleFile = (eye) => {
        const fakeUrl = prompt("Simulación: Ingresa nombre del archivo o URL:", "foto.jpg");
        if(fakeUrl) onAddFile(eye, fakeUrl);
    };

    return (
        <div style={{ background: "#222", padding: 12, borderRadius: 8, border: "1px solid #333" }}>
            <div style={{fontSize:14, fontWeight:"bold", color:"#ddd", marginBottom:10}}>{title}</div>
            <div style={{display:"flex", gap:15}}>
                <EyeColumn 
                    eyeLabel="OD" value={dataOD} 
                    onChange={v => onUpdate('od', v)} 
                    onChipClick={t => appendText('od', t)} 
                    onFileClick={() => handleFile('od')}
                    options={options} 
                />
                <EyeColumn 
                    eyeLabel="OS" value={dataOS} 
                    onChange={v => onUpdate('os', v)} 
                    onChipClick={t => appendText('os', t)} 
                    onFileClick={() => handleFile('os')} 
                    options={options} 
                />
            </div>
        </div>
    );
};

function PrescriptionBuilder({ onAdd }) {
  const [query, setQuery] = useState(""); const [selectedMed, setSelectedMed] = useState(null); const [manualName, setManualName] = useState("");
  const [type, setType] = useState("DROPS"); const [dose, setDose] = useState("1"); const [freq, setFreq] = useState("8"); const [duration, setDuration] = useState("7"); const [eye, setEye] = useState("AO"); 
  const products = useMemo(() => getAllProducts().filter(p => p.category === "MEDICATION"), []);
  const filteredMeds = useMemo(() => { if (!query) return []; const q = query.toLowerCase(); return products.filter(p => p.brand.toLowerCase().includes(q) || p.model.toLowerCase().includes(q)).slice(0, 5); }, [products, query]);
  const handleSelectMed = (prod) => { setSelectedMed(prod); setManualName(`${prod.brand} ${prod.model}`); setQuery(""); if (prod.tags?.presentation) setType(prod.tags.presentation); };
  const generateLine = () => {
    const name = selectedMed ? `${selectedMed.brand} ${selectedMed.model}` : manualName; if (!name) return;
    let instruction = ""; if (type === "DROPS") instruction = `Aplicar ${dose} gota(s) en ${eye} cada ${freq} hrs por ${duration} días.`; else if (type === "OINTMENT") instruction = `Aplicar ${dose} cm en fondo de saco ${eye} cada ${freq} hrs por ${duration} días.`; else if (type === "ORAL") instruction = `Tomar ${dose} (tab/cap) cada ${freq} hrs por ${duration} días.`; else instruction = `Aplicar cada ${freq} hrs por ${duration} días.`;
    onAdd(`• ${name}: ${instruction}`, selectedMed ? { productId: selectedMed.id, productName: `${selectedMed.brand} ${selectedMed.model}`, qty: 1, price: selectedMed.price, instructions: instruction } : null);
    setManualName(""); setSelectedMed(null);
  };
  return (
    <div style={{ background: "#222", border: "1px solid #444", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: "bold", marginBottom: 8 }}>⚡ Agregar Medicamento Rápido</div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input placeholder="Buscar en farmacia o escribir nombre..." value={selectedMed ? `${selectedMed.brand} ${selectedMed.model}` : manualName || query} onChange={e => { setQuery(e.target.value); setManualName(e.target.value); setSelectedMed(null); }} style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #555", background: "#333", color: "white" }} />
        {selectedMed && <span style={{ position: "absolute", right: 10, top: 8, fontSize: 11, color: Number(selectedMed.stock) > 0 ? "#4ade80" : "#f87171", fontWeight: "bold" }}>{Number(selectedMed.stock) > 0 ? `✅ Stock: ${selectedMed.stock}` : `⚠️ Stock: 0`}</span>}
        {query && filteredMeds.length > 0 && !selectedMed && (<div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#333", border: "1px solid #555", zIndex: 10, maxHeight: 150, overflowY: "auto" }}>{filteredMeds.map(p => (<div key={p.id} onClick={() => handleSelectMed(p)} style={{ padding: 8, borderBottom: "1px solid #444", cursor: "pointer", fontSize: 13, display: "flex", justifyContent: "space-between" }}><div>{p.brand} {p.model}</div><div style={{ fontSize: 11, color: Number(p.stock) > 0 ? "#4ade80" : "#f87171", fontWeight: "bold" }}>{Number(p.stock) > 0 ? `Stock: ${p.stock}` : "Agotado"}</div></div>))}</div>)}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
         <label style={{fontSize:11, color:"#aaa"}}>Tipo<select value={type} onChange={e => setType(e.target.value)} style={{display:"block", padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}}><option value="DROPS">Gotas</option><option value="OINTMENT">Ungüento</option><option value="ORAL">Oral</option><option value="OTHER">Otro</option></select></label>
         {(type === "DROPS" || type === "OINTMENT") && <label style={{fontSize:11, color:"#aaa"}}>Ojo<select value={eye} onChange={e => setEye(e.target.value)} style={{display:"block", padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}}><option value="AO">AO</option><option value="OD">OD</option><option value="OI">OI</option></select></label>}
         <input value={dose} onChange={e => setDose(e.target.value)} style={{display:"block", width:40, padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}} placeholder="Cant" />
         <input value={freq} onChange={e => setFreq(e.target.value)} style={{display:"block", width:40, padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}} placeholder="Hrs" />
         <input value={duration} onChange={e => setDuration(e.target.value)} style={{display:"block", width:40, padding:5, borderRadius:4, background:"#333", color:"white", border:"1px solid #555"}} placeholder="Días" />
         <button onClick={(e) => { e.preventDefault(); generateLine(); }} style={{ marginBottom: 1, padding: "6px 12px", background: "#a78bfa", color: "#000", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>+ Agregar</button>
      </div>
    </div>
  );
}

export default function ConsultationDetailPage() {
  const { patientId, consultationId } = useParams();
  const [consultation, setConsultation] = useState(null);
  const [patient, setPatient] = useState(null); 
  const [form, setForm] = useState(null);

  const [exams, setExams] = useState([]);
  const [tick, setTick] = useState(0);
  const [showRxForm, setShowRxForm] = useState(false);
  const [rxForm, setRxForm] = useState(normalizeRxValue());
  const [rxErrors, setRxErrors] = useState({});

  // ESTADO VISUAL ACORDEÓN IPAS
  const [showIPAS, setShowIPAS] = useState(false);

  useEffect(() => {
    const c = getConsultationById(consultationId);
    const p = getPatientById(patientId);
    setPatient(p);

    if (c && c.patientId === patientId) {
      setConsultation(c);
      setForm({
        visitDate: toDateInput(c.visitDate), 
        type: c.type, 
        reason: c.reason, 
        history: c.history, 
        
        // 👈 Cargar SystemsReview (Merge con default para asegurar estructura)
        systemsReview: { ...getEmptySystems(), ...(c.systemsReview || {}) },

        vitalSigns: { ...c.vitalSigns },
        exam: { 
            anterior: { od: {...c.exam.anterior.od}, os: {...c.exam.anterior.os}, notes: c.exam.anterior.notes },
            tonometry: { ...c.exam.tonometry },
            posterior: { od: {...c.exam.posterior.od}, os: {...c.exam.posterior.os}, notes: c.exam.posterior.notes },
            motility: c.exam.motility, gonioscopy: c.exam.gonioscopy
        },
        diagnosis: c.diagnosis, treatment: c.treatment, prescribedMeds: c.prescribedMeds, prognosis: c.prognosis, notes: c.notes
      });
    }
  }, [patientId, consultationId]);

  useEffect(() => { if (consultationId) setExams(getExamsByConsultation(consultationId)); }, [consultationId, tick]);

  const onSaveConsultation = () => { 
      updateConsultation(consultationId, { ...form, visitDate: form.visitDate || new Date().toISOString() }); 
      alert("Nota guardada."); 
  };
  
  const toggleSymptom = (symptom) => {
    let current = form.reason ? form.reason.split(", ").map(s => s.trim()).filter(Boolean) : [];
    if (current.includes(symptom)) current = current.filter(s => s !== symptom); else current.push(symptom);
    setForm(f => ({ ...f, reason: current.join(", ") }));
  };
  
  const applyHistoryTemplate = (e) => { const key = e.target.value; if (!key) return; const t = ALICIA_TEMPLATES[key]; setForm(f => ({ ...f, history: f.history ? f.history + "\n\n" + t : t })); e.target.value = ""; };
  const handleAddMed = (textLine, medObject) => { setForm(prev => ({ ...prev, treatment: (prev.treatment ? prev.treatment + "\n" : "") + textLine, prescribedMeds: medObject ? [...prev.prescribedMeds, medObject] : prev.prescribedMeds })); };
  const removeMedFromList = (i) => { setForm(prev => ({ ...prev, prescribedMeds: prev.prescribedMeds.filter((_, idx) => idx !== i) })); };
  const onSaveExam = (e) => { e.preventDefault(); if (!validateRx(rxForm).isValid) { setRxErrors(validateRx(rxForm).errors); return; } createEyeExam({ patientId, consultationId, examDate: form.visitDate, rx: rxForm, notes: rxForm.notes }); setRxForm(normalizeRxValue()); setShowRxForm(false); setTick(t => t + 1); };
  const onDeleteExam = (id) => { if (confirm("¿Borrar?")) { deleteEyeExam(id); setTick(t => t + 1); } };
  
  const handleAddFile = (section, eye, fileUrl) => {
      setForm(f => ({ ...f, exam: { ...f.exam, [section]: { ...f.exam[section], [eye]: { ...f.exam[section][eye], files: [...(f.exam[section][eye].files || []), fileUrl] } } } }));
      alert("Archivo adjuntado: " + fileUrl);
  };

  const handleAllSystemsNormal = () => {
      if(confirm("¿Marcar todos los sistemas como NORMALES y limpiar detalles?")) {
          setForm(f => ({ ...f, systemsReview: getEmptySystems() }));
      }
  };

  // --- GENERADOR DE RESUMEN CLÍNICO (IPAS + EXPLORACIÓN GENERAL) ---
  const generateClinicalSummary = () => {
      // 1. Definir orden de prioridad (Endo y Cardio primero)
      const priorityKeys = ["endocrine", "cardiovascular"];
      const otherKeys = SYSTEMS_CONFIG.map(s => s.id).filter(k => !priorityKeys.includes(k));
      const sortedKeys = [...priorityKeys, ...otherKeys];

      let summaryLines = [];

      // 2. Título Sección
      summaryLines.push("INTERROGATORIO POR APARATOS Y SISTEMAS:");

      // 3. Iterar sistemas
      sortedKeys.forEach(key => {
          const config = SYSTEMS_CONFIG.find(c => c.id === key);
          const data = form.systemsReview[key] || { isNormal: true, selected: [], details: "" };
          const label = config ? config.label : key; 

          if (data.isNormal) {
              summaryLines.push(`- Sistema ${label}: Interrogado y negado.`);
          } else {
              const selectionText = (data.selected || []).join(", ");
              const detailsText = data.details || "";
              let fullDetails = "";
              if (selectionText && detailsText) fullDetails = `${selectionText}. ${detailsText}`;
              else fullDetails = selectionText || detailsText;

              summaryLines.push(`- Sistema ${label}: Se refiere ${fullDetails || "patología sin especificar"}.`);
          }
      });

      // 4. Espacio y Exploración General
      summaryLines.push(""); 
      summaryLines.push("EXPLORACIÓN FÍSICA GENERAL:");
      summaryLines.push("Cráneo: normocefálico. Cuello cilíndrico sin adenomegalias palpables."); 

      return summaryLines.join("\n");
  };

  // Handler para copiar al portapapeles
  const handleCopySummary = () => {
      const text = generateClinicalSummary();
      navigator.clipboard.writeText(text).then(() => alert("Resumen copiado al portapapeles."));
  };

  // --- FUNCIÓN DE IMPRESIÓN (NOTA CLÍNICA COMPLETA) ---
  const handlePrintClinicalNote = () => {
      const summaryText = generateClinicalSummary().replace(/\n/g, "<br/>"); // Formato HTML
      const date = new Date().toLocaleDateString();
      
      const win = window.open('', '', 'width=900,height=700');
      win.document.write(`
        <html>
          <head>
            <title>Nota Clínica - ${patient?.firstName}</title>
            <style>
              body { font-family: Arial, sans-serif; font-size: 11pt; padding: 40px; }
              h1 { font-size: 16pt; border-bottom: 2px solid #333; margin-bottom: 20px; }
              .header { margin-bottom: 30px; }
              .section { margin-bottom: 20px; }
              .label { font-weight: bold; display: block; margin-bottom: 5px; background: #eee; padding: 5px; }
              .content { white-space: pre-wrap; line-height: 1.5; }
            </style>
          </head>
          <body>
            <h1>Nota de Evolución / Historia Clínica</h1>
            <div class="header">
               <strong>Paciente:</strong> ${patient?.firstName} ${patient?.lastName}<br/>
               <strong>Fecha:</strong> ${date}<br/>
               <strong>Motivo:</strong> ${form.reason}
            </div>

            <div class="section">
               <div class="content">${summaryText}</div> 
            </div>

            <div class="section">
               <div class="label">Exploración Oftalmológica</div>
               <div class="content">
                  <strong>AV (SC):</strong> OD ${form.exam.anterior.od.lids || "-"} | OS ${form.exam.anterior.os.lids || "-"}
                  <br/>
                  <strong>Biomicroscopía:</strong> ${form.exam.anterior.notes || "Sin hallazgos relevantes."}
                  <br/>
                  <strong>Fondo de Ojo:</strong> ${form.exam.posterior.notes || "Sin hallazgos relevantes."}
                  <br/>
                  <strong>PIO:</strong> OD ${form.exam.tonometry.od} / OS ${form.exam.tonometry.os} mmHg
                  <br/>
                  <strong>Diagnóstico:</strong> ${form.diagnosis}
               </div>
            </div>

            <div class="section">
               <div class="label">Plan / Tratamiento</div>
               <div class="content">${form.treatment}</div>
            </div>
            
            <br/><br/>
            <div style="text-align:center; margin-top:50px; border-top:1px solid #000; width:300px; margin-left:auto; margin-right:auto;">
                Firma del Médico
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      win.document.close();
  };

  // --- FUNCIÓN DE IMPRESIÓN (RECETA MEMBRETADA) ---
  const handlePrintPrescription = () => {
    const date = new Date().toLocaleDateString();
    const win = window.open('', '', 'width=800,height=600');
    const MARGIN_TOP_PX = 180; 

    // Generar texto IPAS breve para receta (solo anormales)
    const ipasText = Object.entries(form.systemsReview || {})
        .filter(([_, val]) => !val.isNormal)
        .map(([key, val]) => {
            const label = SYSTEMS_CONFIG.find(c => c.id === key)?.label || key;
            const content = [...(val.selected || []), val.details].filter(Boolean).join(", ");
            return `${label}: ${content}`;
        }).join(". ");

    win.document.write(`
      <html>
        <head>
          <title>Receta ${patient?.firstName || ""}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12pt; margin: 0; padding: 0; }
            .page-content { margin-top: ${MARGIN_TOP_PX}px; margin-left: 60px; margin-right: 60px; }
            .header-row { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 1.1em; }
            .section { margin-bottom: 25px; }
            .label { font-weight: bold; font-size: 0.9em; color: #444; text-transform: uppercase; margin-bottom: 5px; }
            .text-content { white-space: pre-wrap; line-height: 1.6; }
            .signature-box { margin-top: 100px; text-align: center; page-break-inside: avoid; }
            .line { width: 250px; border-top: 1px solid #000; margin: 0 auto 10px auto; }
          </style>
        </head>
        <body>
          <div class="page-content">
            <div class="header-row">
               <div><strong>Paciente:</strong> ${patient?.firstName} ${patient?.lastName}</div>
               <div><strong>Fecha:</strong> ${date}</div>
            </div>

            ${form.diagnosis ? `
            <div class="section">
              <div class="label">Diagnóstico Rx:</div>
              <div class="text-content">${form.diagnosis}</div>
            </div>` : ''}

            <div class="section">
              <div class="label">Tratamiento / Indicaciones:</div>
              <div class="text-content">${form.treatment || "Sin tratamiento específico."}</div>
            </div>
            
            ${ipasText ? `
            <div class="section" style="font-size: 0.9em; color: #666;">
               <div class="label">Observaciones (IPAS):</div>
               <div class="text-content">${ipasText}</div>
            </div>` : ''}

            <div class="signature-box">
               <div class="line"></div>
               <div>Firma del Médico</div>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  if (!consultation || !form) return <div style={{padding:40, textAlign:"center"}}>Cargando...</div>;

  return (
    <div style={{ paddingBottom: 80, width: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <Link to={`/patients/${patientId}`} style={{ color: "#aaa", textDecoration: "none" }}>← Volver</Link>
        <h1 style={{ marginTop: 10, marginBottom: 5 }}>Consulta Oftalmológica</h1>
      </div>

      <div style={{ display: "grid", gap: 30 }}>
        <section style={{ background: "#1a1a1a", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, background:"#111", padding:10, borderRadius:8, border:"1px solid #333" }}>
             <label style={{ fontSize: 13, color: "#888" }}>Fecha Atención <input type="date" value={form.visitDate} onChange={(e) => setForm(f => ({ ...f, visitDate: e.target.value }))} style={{ display:"block", marginTop:4, padding: "6px 10px", background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 }} /></label>
             <div style={{display:"flex", gap:10, alignItems:"center"}}>
                {/* BOTONES DE IMPRESIÓN */}
                <button onClick={handlePrintClinicalNote} style={{ background: "#1e3a8a", border: "1px solid #60a5fa", color: "#bfdbfe", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold", height: "fit-content" }}>🖨️ Nota Clínica</button>
                <button onClick={handlePrintPrescription} style={{ background: "#333", border: "1px solid #ccc", color: "#fff", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold", height: "fit-content" }}>🖨️ Receta</button>
                <button onClick={onSaveConsultation} style={{ background: "#2563eb", border: "none", color: "white", padding: "8px 25px", borderRadius: 6, cursor: "pointer", fontWeight: "bold", height: "fit-content" }}>💾 GUARDAR</button>
             </div>
          </div>

          <div style={{ display: "grid", gap: 30 }}>
            <div>
              <h3 style={{ color:"#60a5fa", borderBottom:"1px solid #60a5fa", paddingBottom:5 }}>1. Interrogatorio</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>{QUICK_DATA.symptoms.map(sym => <QuickChip key={sym} label={sym} active={form.reason.includes(sym)} onClick={() => toggleSymptom(sym)} />)}</div>
              <textarea rows={1} value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} style={textareaStyle} placeholder="Motivo..." />
              <div style={{marginTop:15}}>
                  <select onChange={applyHistoryTemplate} style={{ background: "#333", border: "1px solid #555", color: "#fbbf24", padding: "2px 8px", borderRadius: 4, fontSize: "0.85em", marginBottom:5 }}><option value="">⚡ Plantilla...</option>{Object.keys(ALICIA_TEMPLATES).map(key => <option key={key} value={key}>{key}</option>)}</select>
                  <textarea rows={4} value={form.history} onChange={(e) => setForm(f => ({ ...f, history: e.target.value }))} style={{...textareaStyle, lineHeight:1.5}} placeholder="Historia..." />
              </div>
            </div>

            {/* 👈 NUEVA SECCIÓN: INTERROGATORIO POR APARATOS Y SISTEMAS */}
            <div style={{background:"#111", padding:15, borderRadius:8, border:"1px solid #444"}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                    <h4 style={{color:"#fbbf24", margin:0, cursor:"pointer", display:"flex", alignItems:"center", gap:5}} onClick={() => setShowIPAS(!showIPAS)}>
                       {showIPAS ? "▼" : "▶"} Interrogatorio por Aparatos y Sistemas (IPAS)
                    </h4>
                    
                    <div style={{display:"flex", gap:10}}>
                        <button type="button" onClick={handleCopySummary} style={{fontSize:11, background:"#333", color:"#bfdbfe", border:"1px solid #60a5fa", padding:"3px 8px", borderRadius:4, cursor:"pointer"}} title="Copiar resumen para pegar">
                            📋 Copiar Texto
                        </button>
                        <button type="button" onClick={handleAllSystemsNormal} style={{fontSize:11, background:"#064e3b", color:"#4ade80", border:"1px solid #4ade80", padding:"3px 8px", borderRadius:4, cursor:"pointer"}}>
                            ✓ Todo Negado
                        </button>
                    </div>
                </div>
                
                {showIPAS && (
                    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:10, animation:"fadeIn 0.2s"}}>
                        {SYSTEMS_CONFIG.map(sys => (
                            <SystemAccordion 
                                key={sys.id} 
                                config={sys} 
                                data={form.systemsReview[sys.id] || { isNormal: true, selected: [], details: "" }} 
                                onChange={(val) => setForm(prev => ({ 
                                    ...prev, 
                                    systemsReview: { ...prev.systemsReview, [sys.id]: val } 
                                }))}
                            />
                        ))}
                    </div>
                )}
                {!showIPAS && (
                    <div style={{fontSize:"0.85em", color:"#666", fontStyle:"italic"}}>
                        Click para desplegar. Los sistemas anormales se mostrarán en rojo.
                    </div>
                )}
            </div>

            <div>
              <h3 style={{ color:"#a3a3a3", borderBottom:"1px solid #a3a3a3", paddingBottom:5 }}>2. Signos Vitales</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                 <label><span style={labelStyle}>T/A Sis</span><input type="number" value={form.vitalSigns.sys} onChange={e => setForm(f => ({...f, vitalSigns: {...f.vitalSigns, sys: e.target.value}}))} style={inputStyle} /></label>
                 <label><span style={labelStyle}>T/A Dia</span><input type="number" value={form.vitalSigns.dia} onChange={e => setForm(f => ({...f, vitalSigns: {...f.vitalSigns, dia: e.target.value}}))} style={inputStyle} /></label>
                 <label><span style={labelStyle}>FC</span><input type="number" value={form.vitalSigns.heartRate} onChange={e => setForm(f => ({...f, vitalSigns: {...f.vitalSigns, heartRate: e.target.value}}))} style={inputStyle} /></label>
                 <label><span style={labelStyle}>Temp</span><input type="number" value={form.vitalSigns.temp} onChange={e => setForm(f => ({...f, vitalSigns: {...f.vitalSigns, temp: e.target.value}}))} style={inputStyle} /></label>
              </div>
            </div>

            {/* 3. SEGMENTO ANTERIOR */}
            <div>
              <h3 style={{ color:"#4ade80", borderBottom:"1px solid #4ade80", paddingBottom:5 }}>3. Biomicroscopía (Ant)</h3>
              <div style={{ display: "grid", gap: 20 }}>
                {SEGMENTS_ANTERIOR.map(seg => (
                    <ODOSEditor 
                        key={seg.key} 
                        title={seg.label.toUpperCase()} 
                        dataOD={form.exam.anterior.od[seg.key]} 
                        dataOS={form.exam.anterior.os[seg.key]} 
                        options={QUICK_DATA.anterior[seg.key]} 
                        onUpdate={(eye, val) => setForm(f => ({...f, exam: {...f.exam, anterior: {...f.exam.anterior, [eye]: {...f.exam.anterior[eye], [seg.key]: val}}}}))} 
                        onAddFile={(eye, url) => handleAddFile('anterior', eye, url)} 
                    />
                ))}
                <label><span style={labelStyle}>Notas Adicionales</span><textarea rows={2} value={form.exam.anterior.notes} onChange={e => setForm(f => ({...f, exam: {...f.exam, anterior: {...f.exam.anterior, notes: e.target.value}}}))} style={textareaStyle} /></label>
              </div>
            </div>

            <div>
               <h3 style={{ color:"#fcd34d", borderBottom:"1px solid #fcd34d", paddingBottom:5 }}>4. Tonometría</h3>
               <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 15, background:"#292524", padding:15, borderRadius:8 }}>
                  <label><span style={{...labelStyle, color:"#fcd34d"}}>PIO OD</span><input type="number" value={form.exam.tonometry.od} onChange={e => setForm(f => ({...f, exam: {...f.exam, tonometry: {...f.exam.tonometry, od: e.target.value}}}))} style={inputStyle} /></label>
                  <label><span style={{...labelStyle, color:"#fcd34d"}}>PIO OS</span><input type="number" value={form.exam.tonometry.os} onChange={e => setForm(f => ({...f, exam: {...f.exam, tonometry: {...f.exam.tonometry, os: e.target.value}}}))} style={inputStyle} /></label>
                  <label><span style={labelStyle}>Hora</span><input type="time" value={form.exam.tonometry.time} onChange={e => setForm(f => ({...f, exam: {...f.exam, tonometry: {...f.exam.tonometry, time: e.target.value}}}))} style={inputStyle} /></label>
                  <label style={{gridColumn: "1/-1"}}><span style={labelStyle}>Medicamento / Gotas Aplicadas</span><input value={form.exam.tonometry.meds} onChange={e => setForm(f => ({...f, exam: {...f.exam, tonometry: {...f.exam.tonometry, meds: e.target.value}}}))} style={inputStyle} placeholder="Ej. Tetracaína, Timolol..." /></label>
               </div>
            </div>

            {/* 5. SEGMENTO POSTERIOR */}
            <div>
              <h3 style={{ color:"#f472b6", borderBottom:"1px solid #f472b6", paddingBottom:5 }}>5. Fondo de Ojo (Post)</h3>
              <div style={{ display: "grid", gap: 20 }}>
                {SEGMENTS_POSTERIOR.map(seg => (
                    <ODOSEditor 
                        key={seg.key} 
                        title={seg.label.toUpperCase()} 
                        dataOD={form.exam.posterior.od[seg.key]} 
                        dataOS={form.exam.posterior.os[seg.key]} 
                        options={QUICK_DATA.posterior[seg.key]} 
                        onUpdate={(eye, val) => setForm(f => ({...f, exam: {...f.exam, posterior: {...f.exam.posterior, [eye]: {...f.exam.posterior[eye], [seg.key]: val}}}}))} 
                        onAddFile={(eye, url) => handleAddFile('posterior', eye, url)} 
                    />
                ))}
                 <label><span style={labelStyle}>Notas Adicionales</span><textarea rows={2} value={form.exam.posterior.notes} onChange={e => setForm(f => ({...f, exam: {...f.exam, posterior: {...f.exam.posterior, notes: e.target.value}}}))} style={textareaStyle} /></label>
              </div>
            </div>

            <div>
              <h3 style={{ color:"#a78bfa", borderBottom:"1px solid #a78bfa", paddingBottom:5 }}>6. Diagnóstico y Plan</h3>
              <div style={{ display: "grid", gap: 15 }}>
                <label><span style={labelStyle}>Dx</span><textarea rows={2} value={form.diagnosis} onChange={(e) => setForm(f => ({ ...f, diagnosis: e.target.value }))} style={textareaStyle} /></label>
                <PrescriptionBuilder onAdd={handleAddMed} />
                {form.prescribedMeds.length > 0 && <div style={{ padding: 10, background: "#222", borderRadius: 6, border: "1px solid #444" }}>{form.prescribedMeds.map((m, i) => <div key={i} style={{ display: "flex", gap: 6, fontSize: 12, padding: 4 }}><span>💊 {m.productName}</span><button onClick={() => removeMedFromList(i)} style={{ color: "#f87171", border: "none", background: "none", cursor: "pointer" }}>✕</button></div>)}</div>}
                <label><span style={labelStyle}>Plan</span><textarea rows={6} value={form.treatment} onChange={(e) => setForm(f => ({ ...f, treatment: e.target.value }))} style={{ ...textareaStyle, fontFamily: "monospace" }} /></label>
              </div>
            </div>

          </div>
        </section>

        <section style={{ background: "#111", padding: 20, borderRadius: 12, border: "1px dashed #444" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <h3 style={{ margin: 0, color: "#aaa" }}>Anexo: Refracción</h3>
            {!showRxForm && <button onClick={() => setShowRxForm(true)} style={{ background: "#333", color: "white", border: "1px solid #555", padding: "6px 12px", borderRadius: 4, cursor:"pointer" }}>+ Agregar Rx</button>}
          </div>
          <div style={{ display: "grid", gap: 10 }}>{exams.map(exam => (<div key={exam.id} style={{ background: "#222", padding: 10, borderRadius: 6, borderLeft: "3px solid #60a5fa" }}><div style={{fontSize:"0.9em"}}>OD {exam.rx.od.sph} / OI {exam.rx.os.sph}</div><button onClick={() => onDeleteExam(exam.id)} style={{ fontSize: 11, background: "none", border: "none", color: "#666", cursor: "pointer" }}>Borrar</button></div>))}</div>
          {showRxForm && <div style={{ background: "#1f1f1f", padding: 15, borderRadius: 8 }}><RxPicker value={rxForm} onChange={setRxForm} /><button onClick={onSaveExam} style={{ marginTop: 10, background: "#60a5fa", border: "none", padding: "8px" }}>Guardar Rx</button></div>}
        </section>
      </div>
    </div>
  );
}