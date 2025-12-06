import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { 
  getConsultationById, 
  updateConsultation, 
  addConsultationAddendum, 
  unlockConsultation 
} from "@/services/consultationsStorage";
import { getAuditHistory } from "@/services/auditStorage"; 
import { getPatientById } from "@/services/patientsStorage"; 

// 📍 COMPONENTES
import EyeExamsPanel from "@/components/EyeExamsPanel";
import StudiesPanel from "@/components/StudiesPanel";
import DiagnosisManager from "@/components/consultation/DiagnosisManager";
import InterconsultationForm from "@/components/consultation/InterconsultationForm";
import PrescriptionBuilder from "@/components/consultation/PrescriptionBuilder";
import IPASNervousVisualForm from "@/components/consultation/IPASNervousVisualForm";
import IPASBlockForm from "@/components/consultation/IPASBlockForm";

import PhysicalExamGeneralForm from "@/components/consultation/PhysicalExamGeneralForm";
import PhysicalExamRegionalForm from "@/components/consultation/PhysicalExamRegionalForm";
import PhysicalExamNeuroForm from "@/components/consultation/PhysicalExamNeuroForm"; 

// 🟢 NUEVOS COMPONENTES
import OphthalmologyExamForm from "@/components/consultation/OphthalmologyExamForm";
import AttachmentsPanel from "@/components/consultation/AttachmentsPanel";

// 📍 CONFIGURACIÓN
import { getEmptySystems, QUICK_DATA, ALICIA_TEMPLATES } from "@/utils/consultationConfig";
import { IPAS_NV_CONFIG } from "@/utils/ipasNervousVisualConfig";
import { IPAS_EXTENDED_CONFIG } from "@/utils/ipasExtendedConfig";
import { getPhysicalExamDefaults } from "@/utils/physicalExamConfig";
import { getRegionalExamDefaults, PE_REGIONS_CONFIG } from "@/utils/physicalExamRegionsConfig";
import { getNeuroDefaults, PE_NEURO_CONFIG } from "@/utils/physicalExamNeuroConfig";
import { getOphthalmoDefaults, OPHTHALMO_CONFIG } from "@/utils/ophthalmologyConfig";

function toDateInput(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

// Estilos compartidos
const labelStyle = { color: "#ccc", fontSize: 13, display: "block", marginBottom: 4 };
const inputStyle = { width: "100%", padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4 };
const textareaStyle = { ...inputStyle, resize: "vertical" };

const QuickChip = ({ label, active, onClick }) => (
  <button type="button" onClick={onClick} style={{ padding: "4px 10px", borderRadius: 20, border: active ? "1px solid #4ade80" : "1px solid #444", background: active ? "rgba(74, 222, 128, 0.1)" : "transparent", color: active ? "#fff" : "#aaa", cursor: "pointer", fontSize: "0.8em", transition: "all 0.2s" }}>
    {active ? "✓ " : "+ "}{label}
  </button>
);

const HistoryModal = ({ logs, onClose }) => (
    <div style={{position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", zIndex:200, display:"flex", justifyContent:"center", alignItems:"center"}}>
        <div style={{background:"#1a1a1a", width:600, maxHeight:"80vh", overflowY:"auto", padding:20, borderRadius:10, border:"1px solid #444"}}>
            <h3 style={{marginTop:0, color:"#fbbf24"}}>📜 Auditoría de Cambios</h3>
            <div style={{display:"grid", gap:10}}>
                {logs.length === 0 && <p style={{color:"#666"}}>No hay cambios registrados.</p>}
                {logs.map(log => (
                    <div key={log.id} style={{padding:10, background:"#222", borderRadius:6, borderLeft: log.action==="VOID"?"3px solid red":"3px solid #4ade80"}}>
                        <div style={{display:"flex", justifyContent:"space-between", fontSize:"0.9em", color:"#fff", fontWeight:"bold"}}><span>{log.action} (v{log.version})</span><span>{new Date(log.timestamp).toLocaleString()}</span></div>
                        <div style={{fontSize:"0.85em", color:"#aaa", marginTop:4}}>Usuario: {log.user}</div>
                        {log.reason && <div style={{fontSize:"0.85em", color:"#fbbf24", marginTop:2}}>Motivo: "{log.reason}"</div>}
                    </div>
                ))}
            </div>
            <button onClick={onClose} style={{marginTop:20, padding:"8px 16px", background:"#333", color:"white", border:"none", borderRadius:6, cursor:"pointer", width:"100%"}}>Cerrar</button>
        </div>
    </div>
);

// --- COMPONENTE PRINCIPAL ---
export default function ConsultationDetailPage() {
  const { patientId, consultationId } = useParams();
  const [consultation, setConsultation] = useState(null);
  const [patient, setPatient] = useState(null); 
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  const [tick, setTick] = useState(0);
  const [showIPAS, setShowIPAS] = useState(false); 
  const [showHistory, setShowHistory] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [addendumText, setAddendumText] = useState("");

  useEffect(() => {
    async function loadData() {
        try {
            setLoading(true);
            const [c, p] = await Promise.all([
                getConsultationById(consultationId),
                getPatientById(patientId)
            ]);

            setPatient(p);

            if (c && c.patientId === patientId) {
                setConsultation(c);
                setForm({
                    visitDate: toDateInput(c.visitDate), 
                    type: c.type, 
                    reason: c.reason, 
                    history: c.history, 
                    systemsReview: { ...getEmptySystems(), nervousVisual: {}, extended: {}, ...(c.systemsReview || {}) },
                    physicalExam: {
                        general: c.physicalExam?.general || getPhysicalExamDefaults(),
                        regional: c.physicalExam?.regional || getRegionalExamDefaults(),
                        neuro: c.physicalExam?.neuro || getNeuroDefaults()
                    },
                    // 🟢 CARGA NUEVOS CAMPOS
                    ophthalmologyExam: c.ophthalmologyExam || getOphthalmoDefaults(),
                    attachments: c.attachments || [],
                    
                    diagnoses: c.diagnoses || [],
                    diagnosis: c.diagnosis, 
                    interconsultation: c.interconsultation || { required: false, to: "", reason: "", urgency: "NORMAL", status: "PENDING" },
                    treatment: c.treatment, 
                    prescribedMeds: c.prescribedMeds, 
                    prognosis: c.prognosis || "",
                    notes: c.notes,
                    
                    // 🟢 NUEVO: Cargar SOAP con fallback seguro
                    soap: c.soap || { s: "", o: "", a: "", p: "" }
                });
            } else {
                console.error("Consulta no encontrada o no coincide con paciente");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    loadData();
  }, [patientId, consultationId, tick]);

  useEffect(() => {
      if (showHistory) {
          getAuditHistory(consultationId).then(setAuditLogs).catch(console.error);
      }
  }, [showHistory, consultationId]);

  const isLocked = useMemo(() => {
      if (!consultation) return false;
      if (consultation.forceUnlock) return false; 
      const created = new Date(consultation.createdAt).getTime();
      const now = Date.now();
      const hours = (now - created) / (1000 * 60 * 60);
      return hours > 24; 
  }, [consultation, tick]);

  const onSaveConsultation = async () => { 
      try {
          const reason = prompt("¿Motivo de la actualización?", "Actualización de nota clínica");
          if (reason === null) return;
          
          const dxText = form.diagnoses.map(d => `[${d.code}] ${d.name}`).join(", ");
          
          await updateConsultation(consultationId, { 
              ...form, 
              diagnosis: dxText || form.diagnosis, 
              visitDate: form.visitDate || new Date().toISOString() 
          }, reason); 
          
          alert("Nota guardada exitosamente.");
          setTick(t => t + 1); 
      } catch (error) {
          alert(error.message); 
      }
  };
  
  const handleAddAddendum = async () => {
      if (!addendumText.trim()) return alert("Escribe una nota.");
      try {
          await addConsultationAddendum(consultationId, addendumText, "Usuario Actual");
          setAddendumText("");
          setTick(t => t + 1);
          alert("Nota adicional registrada.");
      } catch (e) {
          alert(e.message);
      }
  };

  const handleAdminUnlock = async () => {
      const reason = prompt("⚠️ ACCIÓN ADMINISTRATIVA\n\nEstás por desbloquear una nota cerrada legalmente.\nIngresa el motivo obligatorio:");
      if (!reason) return;
      try {
          await unlockConsultation(consultationId, reason);
          alert("Consulta desbloqueada.");
          setTick(t => t + 1);
      } catch (e) {
          alert(e.message);
      }
  };

  const toggleSymptom = (symptom) => {
    let current = form.reason ? form.reason.split(", ").map(s => s.trim()).filter(Boolean) : [];
    if (current.includes(symptom)) current = current.filter(s => s !== symptom); else current.push(symptom);
    setForm(f => ({ ...f, reason: current.join(", ") }));
  };
  
  const applyHistoryTemplate = (e) => { const key = e.target.value; if (!key) return; const t = ALICIA_TEMPLATES[key]; setForm(f => ({ ...f, history: f.history ? f.history + "\n\n" + t : t })); e.target.value = ""; };
  const handleAddMed = (textLine, medObject) => { setForm(prev => ({ ...prev, treatment: (prev.treatment ? prev.treatment + "\n" : "") + textLine, prescribedMeds: medObject ? [...prev.prescribedMeds, medObject] : prev.prescribedMeds })); };
  const removeMedFromList = (i) => { setForm(prev => ({ ...prev, prescribedMeds: prev.prescribedMeds.filter((_, idx) => idx !== i) })); };
  const handleAllSystemsNormal = () => { if(confirm("¿Marcar todo IPAS como NORMAL?")) { setForm(f => ({ ...f, systemsReview: { ...getEmptySystems(), nervousVisual: {}, extended: {} } })); } };

  // 📝 GENERADOR DE RESUMEN CLÍNICO
  const generateClinicalSummary = () => {
      let summaryLines = [];
      summaryLines.push("INTERROGATORIO POR APARATOS Y SISTEMAS:");

      // IPAS
      const nv = form.systemsReview.nervousVisual || {};
      Object.values(IPAS_NV_CONFIG).forEach(block => {
          const symptoms = nv[block.id] || {};
          const actives = Object.entries(symptoms).filter(([_, val]) => val.present);
          if (actives.length > 0) {
              const details = actives.map(([k, val]) => {
                  const symConfig = block.symptoms.find(s => s.id === k);
                  const label = symConfig?.label || k;
                  return `${label} (${val.intensity || ''})`;
              });
              summaryLines.push(`${block.title}: ${details.join("; ")}.`);
          }
      });

      summaryLines.push(""); 
      summaryLines.push("EXPLORACIÓN FÍSICA GENERAL:");
      const pe = form.physicalExam?.general || getPhysicalExamDefaults();
      let vitals = [];
      if(pe.vitals?.ta) vitals.push(`TA: ${pe.vitals.ta}`);
      if(pe.vitals?.fc) vitals.push(`FC: ${pe.vitals.fc}`);
      if(pe.anthro?.imc) vitals.push(`IMC: ${pe.anthro.imc}`);
      if(vitals.length) summaryLines.push(`Signos Vitales: ${vitals.join(", ")}.`);
      
      const h = pe.habitus || {};
      summaryLines.push(`Inspección General: Facies ${h.facies}, apariencia ${h.apariencia}.`);

      // Regional
      const pr = form.physicalExam?.regional || {};
      Object.keys(PE_REGIONS_CONFIG).forEach(key => {
          const config = PE_REGIONS_CONFIG[key];
          const data = pr[key] || {};
          if (data.notas) summaryLines.push(`${config.title}: ${data.notas}`);
      });

      // Neuro
      const neuro = form.physicalExam?.neuro || {};
      let neuroText = [];
      Object.keys(PE_NEURO_CONFIG).forEach(key => {
          const config = PE_NEURO_CONFIG[key];
          const data = neuro[key] || {};
          if (data.notas) neuroText.push(`${config.title}: ${data.notas}`);
      });
      if (neuroText.length) summaryLines.push("Neuro: " + neuroText.join("; "));

      // 🟢 OFTALMOLÓGICA ROBUSTA
      summaryLines.push("");
      summaryLines.push("EXPLORACIÓN OFTALMOLÓGICA DETALLADA:");
      const oph = form.ophthalmologyExam;
      Object.keys(OPHTHALMO_CONFIG).forEach(key => {
          const config = OPHTHALMO_CONFIG[key];
          const data = oph[key];
          if (!data.isNormal) {
              const od = Object.entries(data.od).filter(([_,v])=>v).map(([k,v])=>`${k}: ${v}`).join(", ");
              const os = Object.entries(data.os).filter(([_,v])=>v).map(([k,v])=>`${k}: ${v}`).join(", ");
              if(od || os) summaryLines.push(`${config.title}: [OD] ${od || "Sin datos"} | [OI] ${os || "Sin datos"}`);
          }
      });

      // 🟢 RESUMEN DE NUEVAS SECCIONES
      summaryLines.push("");
      summaryLines.push(`DIAGNÓSTICO: ${form.diagnosis || "Pendiente"}`);
      if (form.diagnoses.length) summaryLines.push(`CIE-11: ${form.diagnoses.map(d=>d.name).join(", ")}`);
      
      summaryLines.push(`PLAN: ${form.treatment || "Pendiente"}`);
      if (form.prescribedMeds.length) summaryLines.push(`Medicamentos: ${form.prescribedMeds.map(m=>m.productName).join(", ")}`);
      
      summaryLines.push(`PRONÓSTICO: ${form.prognosis || "Reservado"}`);

      return summaryLines.join("\n");
  };

  const handleCopySummary = () => { const text = generateClinicalSummary(); navigator.clipboard.writeText(text).then(() => alert("Resumen copiado.")); };

  const handlePrintClinicalNote = () => {
      const summaryText = generateClinicalSummary().replace(/\n/g, "<br/>"); 
      const date = new Date().toLocaleDateString();
      const dxHtml = form.diagnoses.length > 0 ? form.diagnoses.map(d => `<div><strong>${d.type === "PRINCIPAL" ? "Dx Principal:" : "Dx:"}</strong> ${d.name}</div>`).join("") : `<div>${form.diagnosis || "Sin diagnóstico."}</div>`;
      const win = window.open('', '', 'width=900,height=700');
      win.document.write(`<html><head><title>Nota</title><style>body{font-family:Arial;padding:40px;line-height:1.5}</style></head><body><h1>Nota Clínica</h1><div><strong>${patient?.firstName}</strong> - ${date}</div><hr/><div style="white-space:pre-wrap">${summaryText}</div><br/><div style="background:#eee;padding:10px">${dxHtml}</div><script>window.print();</script></body></html>`);
      win.document.close();
  };

  const handlePrintPrescription = () => { /* ... Lógica existente ... */ };

  if (loading) return <div style={{padding:40, textAlign:"center"}}>Cargando consulta...</div>;
  if (!consultation || !form) return <div style={{padding:40, textAlign:"center"}}>No se encontró información.</div>;

  return (
    <div style={{ paddingBottom: 80, width: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <Link to={`/patients/${patientId}`} style={{ color: "#aaa", textDecoration: "none" }}>← Volver</Link>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
            <h1 style={{ marginTop: 10, marginBottom: 5 }}>Consulta Oftalmológica (v{consultation.version})</h1>
            <span style={{fontSize:"0.8em", background:"#333", padding:"2px 6px", borderRadius:4, color:"#aaa"}}>{consultation.status === "ACTIVE" ? "Activa" : "Anulada"}</span>
        </div>
      </div>

      {isLocked && <div style={{ background: "#451a03", border: "1px solid #f97316", color: "#fdba74", padding: "10px", borderRadius: 8, marginBottom: 20 }}>🔒 Consulta Cerrada <button onClick={handleAdminUnlock} style={{marginLeft:10}}>Desbloquear</button></div>}

      <div style={{ display: "grid", gap: 30 }}>
        <section style={{ background: "#1a1a1a", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
          
          {/* CABECERA */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, background:"#111", padding:10, borderRadius:8, border:"1px solid #333" }}>
             <label style={{ fontSize: 13, color: "#888" }}>Fecha Atención 
                <input type="date" disabled={isLocked} value={form.visitDate} onChange={(e) => setForm(f => ({ ...f, visitDate: e.target.value }))} style={{...inputStyle, width:"auto", marginLeft:10}} />
             </label>
             <div style={{display:"flex", gap:10, alignItems:"center"}}>
                <button onClick={() => setShowHistory(true)} style={{ background: "transparent", border: "1px solid #666", color: "#888", padding: "8px 12px", borderRadius: 6, cursor: "pointer" }} title="Ver historial">📜</button>
                <button onClick={handlePrintClinicalNote} style={{ background: "#1e3a8a", border: "1px solid #60a5fa", color: "#bfdbfe", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold", height: "fit-content" }}>🖨️ Nota</button>
                <button onClick={handlePrintPrescription} style={{ background: "#333", border: "1px solid #ccc", color: "#fff", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold", height: "fit-content" }}>🖨️ Receta</button>
                {!isLocked && (
                    <button onClick={onSaveConsultation} style={{ background: "#2563eb", border: "none", color: "white", padding: "8px 25px", borderRadius: 6, cursor: "pointer", fontWeight: "bold", height: "fit-content" }}>💾 GUARDAR</button>
                )}
             </div>
          </div>

          <fieldset disabled={isLocked} style={{ border: "none", padding: 0, margin: 0, minInlineSize: "auto" }}>
              <div style={{ display: "grid", gap: 30 }}>
                
                {/* 1. INTERROGATORIO */}
                <div>
                  <h3 style={{ color:"#60a5fa", borderBottom:"1px solid #60a5fa", paddingBottom:5 }}>1. Interrogatorio</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>{QUICK_DATA.symptoms.map(sym => <QuickChip key={sym} label={sym} active={form.reason.includes(sym)} onClick={() => toggleSymptom(sym)} />)}</div>
                  <textarea rows={1} value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} style={textareaStyle} placeholder="Motivo..." />
                  <div style={{marginTop:15}}>
                      <select onChange={applyHistoryTemplate} style={{ background: "#333", border: "1px solid #555", color: "#fbbf24", padding: "2px 8px", borderRadius: 4, fontSize: "0.85em", marginBottom:5 }}><option value="">⚡ Plantilla...</option>{Object.keys(ALICIA_TEMPLATES).map(key => <option key={key} value={key}>{key}</option>)}</select>
                      <textarea rows={4} value={form.history} onChange={(e) => setForm(f => ({ ...f, history: e.target.value }))} style={{...textareaStyle, lineHeight:1.5}} placeholder="Historia..." />
                  </div>
                </div>

                {/* IPAS */}
                <div style={{background:"#111", padding:15, borderRadius:8, border:"1px solid #444"}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                        <h4 style={{color:"#fbbf24", margin:0, cursor:"pointer"}} onClick={() => setShowIPAS(!showIPAS)}>{showIPAS ? "▼" : "▶"} Interrogatorio por Aparatos y Sistemas (IPAS)</h4>
                        <div style={{display:"flex", gap:10}}>
                            <button type="button" onClick={handleCopySummary} style={{fontSize:11, background:"#333", color:"#bfdbfe", border:"1px solid #60a5fa", padding:"3px 8px", borderRadius:4, cursor:"pointer"}}>📋 Copiar</button>
                            <button type="button" onClick={handleAllSystemsNormal} style={{fontSize:11, background:"#064e3b", color:"#4ade80", border:"1px solid #4ade80", padding:"3px 8px", borderRadius:4, cursor:"pointer"}}>✓ Todo Negado</button>
                        </div>
                    </div>
                    {showIPAS && (
                        <div style={{animation:"fadeIn 0.2s"}}>
                            <IPASNervousVisualForm data={form.systemsReview.nervousVisual || {}} onChange={(val) => setForm(prev => ({ ...prev, systemsReview: { ...prev.systemsReview, nervousVisual: val } }))} />
                            <IPASBlockForm title="📋 Otros Sistemas" config={IPAS_EXTENDED_CONFIG} data={form.systemsReview.extended || {}} onChange={(val) => setForm(prev => ({ ...prev, systemsReview: { ...prev.systemsReview, extended: val } }))} />
                        </div>
                    )}
                </div>

                {/* 2. EXPLORACIÓN FÍSICA Y NEURO (ACORDEONES) */}
                <div style={{marginTop: 20}}>
                    <h3 style={{ color:"#a78bfa", borderBottom:"1px solid #a78bfa", paddingBottom:5 }}>2. Exploración Física</h3>
                    <PhysicalExamGeneralForm 
                        data={form.physicalExam?.general} 
                        onChange={(val) => setForm(prev => ({ ...prev, physicalExam: { ...prev.physicalExam, general: val } }))} 
                    />
                    <PhysicalExamRegionalForm 
                        data={form.physicalExam?.regional} 
                        onChange={(val) => setForm(prev => ({ ...prev, physicalExam: { ...prev.physicalExam, regional: val } }))} 
                    />
                    <PhysicalExamNeuroForm 
                        data={form.physicalExam?.neuro}
                        onChange={(val) => setForm(prev => ({ ...prev, physicalExam: { ...prev.physicalExam, neuro: val } }))}
                    />
                </div>

                {/* 3. EXAMEN DE LA VISTA (RX) */}
                <EyeExamsPanel patientId={patientId} consultationId={consultationId} />

                {/* 4. OFTALMOLOGÍA ROBUSTA */}
                <div style={{ marginTop: 20 }}>
                   <OphthalmologyExamForm 
                      data={form.ophthalmologyExam}
                      onChange={(val) => setForm(prev => ({ ...prev, ophthalmologyExam: val }))}
                   />
                </div>

                {/* 🟢 NUEVAS SECCIONES REORGANIZADAS */}
                
                <div style={{ marginTop: 30, display: "grid", gap: 30 }}>
                    
                    {/* 5. IMPRESIÓN DIAGNÓSTICA */}
                    <section style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
                        <h3 style={{ color:"#a78bfa", borderBottom:"1px solid #a78bfa", paddingBottom:5, marginTop:0 }}>
                            5. Impresión Diagnóstica Oftalmológica
                        </h3>
                        <div style={{ display: "grid", gap: 15 }}>
                            <DiagnosisManager 
                                diagnoses={form.diagnoses} 
                                onChange={(newDx) => setForm(f => ({ ...f, diagnoses: newDx }))} 
                            />
                            
                            <label style={{ fontSize: 13, color: "#ccc" }}>Notas diagnósticas complementarias:</label>
                            <textarea 
                                rows={2} 
                                value={form.diagnosis} 
                                onChange={(e) => setForm(f => ({ ...f, diagnosis: e.target.value }))} 
                                style={{...textareaStyle, background:"#111"}} 
                                placeholder="Descripción libre del diagnóstico..." 
                            />
                            
                            <InterconsultationForm 
                                data={form.interconsultation} 
                                onChange={(newVal) => setForm(f => ({ ...f, interconsultation: newVal }))} 
                            />
                        </div>
                    </section>

                    {/* 6. PLAN TERAPÉUTICO */}
                    <section style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
                        <h3 style={{ color:"#4ade80", borderBottom:"1px solid #4ade80", paddingBottom:5, marginTop:0 }}>
                            6. Plan Terapéutico
                        </h3>
                        <div style={{ display: "grid", gap: 15 }}>
                            <label style={{ fontSize: 13, color: "#ccc" }}>Farmacoterapia (Receta):</label>
                            
                            <PrescriptionBuilder onAdd={handleAddMed} />
                            
                            {form.prescribedMeds.length > 0 && (
                                <div style={{ padding: 10, background: "#222", borderRadius: 6, border: "1px solid #444" }}>
                                    {form.prescribedMeds.map((m, i) => (
                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "6px 0", borderBottom: "1px dashed #333" }}>
                                            <span>💊 <strong>{m.productName}</strong>: {m.instructions}</span>
                                            <button onClick={() => removeMedFromList(i)} style={{ color: "#f87171", border: "none", background: "none", cursor: "pointer" }}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <label style={{ fontSize: 13, color: "#ccc", marginTop: 10 }}>Plan de Manejo / Indicaciones al Paciente:</label>
                            <textarea 
                                rows={4} 
                                value={form.treatment} 
                                onChange={(e) => setForm(f => ({ ...f, treatment: e.target.value }))} 
                                style={{ ...textareaStyle, fontFamily: "monospace" }} 
                                placeholder="Indicaciones generales, cuidados, alarmas..."
                            />
                        </div>
                    </section>

                    {/* 7. PRONÓSTICO */}
                    <section style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
                        <h3 style={{ color:"#fbbf24", borderBottom:"1px solid #fbbf24", paddingBottom:5, marginTop:0 }}>
                            7. Pronóstico
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 15, alignItems: "start" }}>
                            <select 
                                value={["Bueno", "Malo", "Reservado"].includes(form.prognosis) ? form.prognosis : "OTRO"} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setForm(f => ({ ...f, prognosis: val === "OTRO" ? "" : val }));
                                }} 
                                style={{ padding: 10, background: "#222", border: "1px solid #444", color: "white", borderRadius: 6 }}
                            >
                                <option value="">-- Seleccionar --</option>
                                <option value="Bueno">Bueno para la función visual</option>
                                <option value="Reservado">Reservado a evolución</option>
                                <option value="Malo">Malo para la función visual</option>
                                <option value="OTRO">Otro / Específico</option>
                            </select>
                            
                            <input 
                                placeholder="Detalles del pronóstico (opcional)..." 
                                value={form.prognosis} 
                                onChange={(e) => setForm(f => ({ ...f, prognosis: e.target.value }))} 
                                style={inputStyle} 
                            />
                        </div>
                    </section>

                    {/* 8. NOTA EVOLUTIVA (SOAP) */}
                    <section style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
                        <h3 style={{ color:"#60a5fa", borderBottom:"1px solid #60a5fa", paddingBottom:5, marginTop:0 }}>
                            8. Nota Evolutiva (SOAP)
                        </h3>
                        <div style={{ display: "grid", gap: 15 }}>
                            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:15}}>
                                <label>
                                    <span style={{color:"#aaa", fontSize:12, fontWeight:"bold"}}>S (Subjetivo)</span>
                                    <textarea 
                                        rows={3} 
                                        placeholder="Lo que el paciente refiere..."
                                        value={form.soap?.s || ""}
                                        onChange={e => setForm(f => ({...f, soap: {...f.soap, s: e.target.value}}))}
                                        style={textareaStyle} 
                                    />
                                </label>
                                <label>
                                    <span style={{color:"#aaa", fontSize:12, fontWeight:"bold"}}>O (Objetivo)</span>
                                    <textarea 
                                        rows={3} 
                                        placeholder="Hallazgos relevantes de la exploración..."
                                        value={form.soap?.o || ""}
                                        onChange={e => setForm(f => ({...f, soap: {...f.soap, o: e.target.value}}))}
                                        style={textareaStyle} 
                                    />
                                </label>
                            </div>
                            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:15}}>
                                <label>
                                    <span style={{color:"#aaa", fontSize:12, fontWeight:"bold"}}>A (Análisis)</span>
                                    <textarea 
                                        rows={3} 
                                        placeholder="Interpretación de hallazgos..."
                                        value={form.soap?.a || ""}
                                        onChange={e => setForm(f => ({...f, soap: {...f.soap, a: e.target.value}}))}
                                        style={textareaStyle} 
                                    />
                                </label>
                                <label>
                                    <span style={{color:"#aaa", fontSize:12, fontWeight:"bold"}}>P (Plan)</span>
                                    <textarea 
                                        rows={3} 
                                        placeholder="Pasos a seguir..."
                                        value={form.soap?.p || ""}
                                        onChange={e => setForm(f => ({...f, soap: {...f.soap, p: e.target.value}}))}
                                        style={textareaStyle} 
                                    />
                                </label>
                            </div>
                        </div>
                    </section>

                </div>
              </div>
          </fieldset>
        </section>

        {/* --- SECCIÓN DE ADDENDUMS --- */}
        <section style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
            <h3 style={{ margin: "0 0 15px 0", color: "#fbbf24", borderBottom: "1px solid #fbbf24", paddingBottom: 5 }}>
                📝 Notas Adicionales (Addendums)
            </h3>
            {consultation.addendums && consultation.addendums.length > 0 ? (
                <div style={{display:"grid", gap:10, marginBottom:20}}>
                    {consultation.addendums.map(add => (
                        <div key={add.id} style={{background:"#2a2a2a", padding:12, borderRadius:6, borderLeft:"3px solid #fbbf24"}}>
                            <div style={{fontSize:11, color:"#888", marginBottom:4}}>
                                {new Date(add.createdAt).toLocaleString()} por <strong>{add.createdBy}</strong>
                            </div>
                            <div style={{whiteSpace:"pre-wrap", color:"#eee"}}>{add.text}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{color:"#666", fontStyle:"italic", marginBottom:20}}>No hay notas adicionales.</div>
            )}

            <div style={{ background: "#111", padding: 15, borderRadius: 8, border: "1px dashed #555" }}>
                <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 5 }}>Agregar Nota de Evolución / Aclaración</label>
                <textarea rows={2} value={addendumText} onChange={e => setAddendumText(e.target.value)} placeholder="Escribe aquí información adicional posterior al cierre de la consulta..." style={{ ...textareaStyle, background: "#222" }} />
                <div style={{textAlign:"right", marginTop:10}}>
                    <button onClick={handleAddAddendum} style={{ background: "#fbbf24", color: "black", border: "none", padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>+ Agregar Nota</button>
                </div>
            </div>
        </section>

        {/* 📍 ADJUNTOS (NUEVO) */}
        <AttachmentsPanel 
           attachments={form.attachments}
           onUpdate={(newAttachments) => setForm(prev => ({ ...prev, attachments: newAttachments }))}
        />

        {/* 📍 ESTUDIOS (LEGACY, MANTENER POR SI ACASO) */}
        <StudiesPanel patientId={patientId} consultationId={consultationId} />

      </div>

      {showHistory && <HistoryModal logs={auditLogs} onClose={() => setShowHistory(false)} />}
    </div>
  );
}