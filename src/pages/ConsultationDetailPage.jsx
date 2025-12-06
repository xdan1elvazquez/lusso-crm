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
import ODOSEditor from "@/components/consultation/ODOSEditor";
import DiagnosisManager from "@/components/consultation/DiagnosisManager";
import InterconsultationForm from "@/components/consultation/InterconsultationForm";
import PrescriptionBuilder from "@/components/consultation/PrescriptionBuilder";
import IPASNervousVisualForm from "@/components/consultation/IPASNervousVisualForm";
import IPASBlockForm from "@/components/consultation/IPASBlockForm";

// 📍 CONFIGURACIÓN
import { 
    getEmptySystems, QUICK_DATA, 
    SEGMENTS_ANTERIOR, SEGMENTS_POSTERIOR, ALICIA_TEMPLATES 
} from "@/utils/consultationConfig";
import { IPAS_NV_CONFIG } from "@/utils/ipasNervousVisualConfig";
import { IPAS_EXTENDED_CONFIG } from "@/utils/ipasExtendedConfig";

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
  const [showIPAS, setShowIPAS] = useState(true); 
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
                    // Aseguramos la existencia de los nuevos objetos en systemsReview
                    systemsReview: { 
                        ...getEmptySystems(), 
                        nervousVisual: {}, 
                        extended: {}, 
                        ...(c.systemsReview || {}) 
                    },
                    vitalSigns: { ...c.vitalSigns },
                    exam: { 
                        anterior: { od: {...c.exam.anterior.od}, os: {...c.exam.anterior.os}, notes: c.exam.anterior.notes },
                        tonometry: { ...c.exam.tonometry },
                        posterior: { od: {...c.exam.posterior.od}, os: {...c.exam.posterior.os}, notes: c.exam.posterior.notes },
                        motility: c.exam.motility, gonioscopy: c.exam.gonioscopy
                    },
                    diagnoses: c.diagnoses || [],
                    diagnosis: c.diagnosis, 
                    interconsultation: c.interconsultation || { required: false, to: "", reason: "", urgency: "NORMAL", status: "PENDING" },
                    treatment: c.treatment, prescribedMeds: c.prescribedMeds, prognosis: c.prognosis, notes: c.notes
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
          
          const dxText = form.diagnoses.map(d => `${d.code} ${d.name}`).join(", ");
          const finalForm = { ...form, diagnosis: dxText || form.diagnosis };
          
          await updateConsultation(consultationId, { ...finalForm, visitDate: form.visitDate || new Date().toISOString() }, reason); 
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
          alert("Consulta desbloqueada. Se ha registrado el evento en auditoría.");
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
  const handleAddFile = (section, eye, fileUrl) => { setForm(f => ({ ...f, exam: { ...f.exam, [section]: { ...f.exam[section], [eye]: { ...f.exam[section][eye], files: [...(f.exam[section][eye].files || []), fileUrl] } } } })); alert("Archivo adjuntado: " + fileUrl); };
  const handleAllSystemsNormal = () => { if(confirm("¿Marcar todos los sistemas como NORMALES y limpiar detalles?")) { setForm(f => ({ ...f, systemsReview: { ...getEmptySystems(), nervousVisual: {}, extended: {} } })); } };

  // 📝 GENERADOR DE RESUMEN CLÍNICO (Narrativa)
  const generateClinicalSummary = () => {
      let summaryLines = [];
      summaryLines.push("INTERROGATORIO POR APARATOS Y SISTEMAS:");

      // A. Módulo Nervioso y Visual
      const nv = form.systemsReview.nervousVisual || {};
      Object.values(IPAS_NV_CONFIG).forEach(block => {
          const symptoms = nv[block.id] || {};
          const actives = Object.entries(symptoms).filter(([_, val]) => val.present);
          if (actives.length > 0) {
              const details = actives.map(([k, val]) => {
                  const symConfig = block.symptoms.find(s => s.id === k);
                  const label = symConfig?.label || k;
                  let parts = [];
                  if (val.intensity) parts.push(`Int: ${val.intensity}`);
                  if (val.munk) parts.push(`Munk: ${val.munk}`);
                  if (val.zone) parts.push(`Zona: ${val.zone}`);
                  if (val.condition) parts.push(val.condition);
                  if (val.duration) parts.push(val.duration);
                  // Especiales
                  if (val.color) parts.push(`Color: ${val.color}`);
                  if (val.consistency) parts.push(`Cons: ${val.consistency}`);
                  if (val.shape) parts.push(`Forma: ${val.shape}`);
                  return `${label} (${parts.join(", ")})`;
              });
              summaryLines.push(`${block.title}: Se refiere ${details.join("; ")}.`);
          } else {
              summaryLines.push(`${block.title}: Negado.`);
          }
      });

      // B. Módulo Extendido (NUEVO)
      const ext = form.systemsReview.extended || {};
      Object.values(IPAS_EXTENDED_CONFIG).forEach(block => {
          const blockData = ext[block.id] || {};
          // 1. Datos de cabecera (Gineco)
          let headerText = [];
          if (block.headerFields) {
              block.headerFields.forEach(f => {
                  const val = blockData[f.id];
                  if (val) headerText.push(`${f.label}: ${val}`);
              });
          }
          
          // 2. Síntomas
          const actives = block.symptoms.filter(sym => blockData[sym.id]?.present).map(sym => {
              const val = blockData[sym.id];
              let parts = [];
              if (val.zone) parts.push(val.zone);
              if (val.intensity) parts.push(val.intensity);
              if (val.duration) parts.push(val.duration);
              if (val.condition) parts.push(val.condition);
              return `${sym.label} (${parts.join(", ")})`;
          });

          if (headerText.length > 0 || actives.length > 0) {
              let text = `${block.title}:`;
              if (headerText.length > 0) text += " " + headerText.join(", ") + ".";
              if (actives.length > 0) text += " Refiere: " + actives.join("; ") + ".";
              summaryLines.push(text);
          } else {
              summaryLines.push(`${block.title}: Negado.`);
          }
      });

      summaryLines.push(""); summaryLines.push("EXPLORACIÓN FÍSICA GENERAL:"); summaryLines.push("Cráneo: normocefálico. Cuello cilíndrico sin adenomegalias palpables."); 
      return summaryLines.join("\n");
  };

  const handleCopySummary = () => { const text = generateClinicalSummary(); navigator.clipboard.writeText(text).then(() => alert("Resumen copiado al portapapeles.")); };

  const handlePrintClinicalNote = () => {
      const summaryText = generateClinicalSummary().replace(/\n/g, "<br/>"); 
      const date = new Date().toLocaleDateString();
      const dxHtml = form.diagnoses.length > 0 ? form.diagnoses.map(d => `<div><strong>${d.type === "PRINCIPAL" ? "Dx Principal:" : "Dx:"}</strong> [${d.code}] ${d.name}</div>`).join("") : `<div>${form.diagnosis || "Sin diagnóstico."}</div>`;
      const icHtml = form.interconsultation.required ? `<div style="margin-top:10px; border:1px solid #000; padding:10px;"><strong>SOLICITUD DE INTERCONSULTA</strong><br/><strong>Para:</strong> ${form.interconsultation.to}<br/><strong>Prioridad:</strong> ${form.interconsultation.urgency}<br/><strong>Motivo:</strong> ${form.interconsultation.reason}</div>` : "";

      const win = window.open('', '', 'width=900,height=700');
      win.document.write(`
        <html>
          <head><title>Nota Clínica - ${patient?.firstName}</title><style>body { font-family: Arial, sans-serif; font-size: 11pt; padding: 40px; } h1 { font-size: 16pt; border-bottom: 2px solid #333; margin-bottom: 20px; } .header { margin-bottom: 30px; } .section { margin-bottom: 20px; } .label { font-weight: bold; display: block; margin-bottom: 5px; background: #eee; padding: 5px; } .content { white-space: pre-wrap; line-height: 1.5; }</style></head>
          <body>
            <h1>Nota de Evolución / Historia Clínica</h1>
            <div class="header"><strong>Paciente:</strong> ${patient?.firstName} ${patient?.lastName}<br/><strong>Fecha:</strong> ${date}<br/><strong>Motivo:</strong> ${form.reason}</div>
            <div class="section"><div class="content">${summaryText}</div></div>
            <div class="section"><div class="label">Exploración Oftalmológica</div><div class="content"><strong>Biomicroscopía:</strong> ${form.exam.anterior.notes || "Sin hallazgos relevantes."}<br/><strong>Fondo de Ojo:</strong> ${form.exam.posterior.notes || "Sin hallazgos relevantes."}<br/><strong>PIO:</strong> OD ${form.exam.tonometry.od} / OS ${form.exam.tonometry.os} mmHg</div></div>
            <div class="section"><div class="label">Diagnóstico (CIE-10)</div><div class="content">${dxHtml}</div></div>
            <div class="section"><div class="label">Plan / Tratamiento</div><div class="content">${form.treatment}</div></div>
            ${icHtml}
            <br/><br/><div style="text-align:center; margin-top:50px; border-top:1px solid #000; width:300px; margin-left:auto; margin-right:auto;">Firma del Médico</div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      win.document.close();
  };

  const handlePrintPrescription = () => {
    const date = new Date().toLocaleDateString();
    const win = window.open('', '', 'width=800,height=600');
    const MARGIN_TOP_PX = 180; 
    const ipasText = "Ver nota clínica completa para detalle de IPAS."; 

    win.document.write(`
      <html>
        <head><title>Receta ${patient?.firstName || ""}</title><style>body { font-family: Arial, sans-serif; font-size: 12pt; margin: 0; padding: 0; } .page-content { margin-top: ${MARGIN_TOP_PX}px; margin-left: 60px; margin-right: 60px; } .header-row { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 1.1em; } .section { margin-bottom: 25px; } .label { font-weight: bold; font-size: 0.9em; color: #444; text-transform: uppercase; margin-bottom: 5px; } .text-content { white-space: pre-wrap; line-height: 1.6; } .signature-box { margin-top: 100px; text-align: center; page-break-inside: avoid; } .line { width: 250px; border-top: 1px solid #000; margin: 0 auto 10px auto; }</style></head>
        <body>
          <div class="page-content">
            <div class="header-row"><div><strong>Paciente:</strong> ${patient?.firstName} ${patient?.lastName}</div><div><strong>Fecha:</strong> ${date}</div></div>
            ${form.diagnosis ? `<div class="section"><div class="label">Diagnóstico Rx:</div><div class="text-content">${form.diagnosis}</div></div>` : ''}
            <div class="section"><div class="label">Tratamiento / Indicaciones:</div><div class="text-content">${form.treatment || "Sin tratamiento específico."}</div></div>
            ${ipasText ? `<div class="section" style="font-size: 0.9em; color: #666;"><div class="label">Observaciones (IPAS):</div><div class="text-content">${ipasText}</div></div>` : ''}
            <div class="signature-box"><div class="line"></div><div>Firma del Médico</div></div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  if (loading) return <div style={{padding:40, textAlign:"center"}}>Cargando consulta...</div>;
  if (!consultation || !form) return <div style={{padding:40, textAlign:"center"}}>No se encontró información de la consulta.</div>;

  return (
    <div style={{ paddingBottom: 80, width: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <Link to={`/patients/${patientId}`} style={{ color: "#aaa", textDecoration: "none" }}>← Volver</Link>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
            <h1 style={{ marginTop: 10, marginBottom: 5 }}>Consulta Oftalmológica (v{consultation.version})</h1>
            <span style={{fontSize:"0.8em", background:"#333", padding:"2px 6px", borderRadius:4, color:"#aaa"}}>{consultation.status === "ACTIVE" ? "Activa" : "Anulada"}</span>
        </div>
      </div>

      {isLocked && (
          <div style={{ background: "#451a03", border: "1px solid #f97316", color: "#fdba74", padding: "10px 15px", borderRadius: 8, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{display:"flex", gap:10, alignItems:"center"}}>
                  <span style={{fontSize:20}}>🔒</span>
                  <div>
                      <strong>Consulta Cerrada (Solo Lectura)</strong>
                      <div style={{fontSize:12, opacity:0.8}}>Han pasado más de 24 horas desde la creación. Para correcciones, usa "Nota Adicional".</div>
                  </div>
              </div>
              <button onClick={handleAdminUnlock} style={{fontSize:11, background:"transparent", border:"1px solid #fdba74", color:"#fdba74", padding:"4px 8px", borderRadius:4, cursor:"pointer"}}>
                  🔓 Desbloquear (Admin)
              </button>
          </div>
      )}

      <div style={{ display: "grid", gap: 30 }}>
        <section style={{ background: "#1a1a1a", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, background:"#111", padding:10, borderRadius:8, border:"1px solid #333" }}>
             <label style={{ fontSize: 13, color: "#888" }}>Fecha Atención 
                <input type="date" disabled={isLocked} value={form.visitDate} onChange={(e) => setForm(f => ({ ...f, visitDate: e.target.value }))} style={{ display:"block", marginTop:4, padding: "6px 10px", background: isLocked ? "#333" : "#222", border: "1px solid #444", color: isLocked ? "#aaa" : "white", borderRadius: 4 }} />
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

                {/* IPAS (SISTEMAS) */}
                <div style={{background:"#111", padding:15, borderRadius:8, border:"1px solid #444"}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                        <h4 style={{color:"#fbbf24", margin:0, cursor:"pointer", display:"flex", alignItems:"center", gap:5}} onClick={() => setShowIPAS(!showIPAS)}>
                           {showIPAS ? "▼" : "▶"} Interrogatorio por Aparatos y Sistemas (IPAS)
                        </h4>
                        
                        <div style={{display:"flex", gap:10}}>
                            <button type="button" onClick={handleCopySummary} style={{fontSize:11, background:"#333", color:"#bfdbfe", border:"1px solid #60a5fa", padding:"3px 8px", borderRadius:4, cursor:"pointer"}}>📋 Copiar</button>
                            <button type="button" onClick={handleAllSystemsNormal} style={{fontSize:11, background:"#064e3b", color:"#4ade80", border:"1px solid #4ade80", padding:"3px 8px", borderRadius:4, cursor:"pointer"}}>
                                ✓ Todo Negado
                            </button>
                        </div>
                    </div>
                    {showIPAS && (
                        <div style={{animation:"fadeIn 0.2s"}}>
                            {/* 1. MÓDULO NERVIOSO Y VISUAL (Anterior) */}
                            <IPASNervousVisualForm 
                                data={form.systemsReview.nervousVisual || {}} 
                                onChange={(val) => setForm(prev => ({ 
                                    ...prev, 
                                    systemsReview: { ...prev.systemsReview, nervousVisual: val } 
                                }))}
                            />

                            {/* 2. MÓDULO EXTENDIDO (Nuevo: Respiratorio, Digestivo, etc) */}
                            <IPASBlockForm 
                                title="📋 Otros Sistemas: Respiratorio, Digestivo, Gineco..."
                                config={IPAS_EXTENDED_CONFIG}
                                data={form.systemsReview.extended || {}}
                                onChange={(val) => setForm(prev => ({ 
                                    ...prev, 
                                    systemsReview: { ...prev.systemsReview, extended: val } 
                                }))}
                            />
                        </div>
                    )}
                </div>

                {/* 2. SIGNOS VITALES */}
                <div>
                  <h3 style={{ color:"#a3a3a3", borderBottom:"1px solid #a3a3a3", paddingBottom:5 }}>2. Signos Vitales</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                     <label><span style={labelStyle}>T/A Sis</span><input type="number" value={form.vitalSigns.sys} onChange={e => setForm(f => ({...f, vitalSigns: {...f.vitalSigns, sys: e.target.value}}))} style={inputStyle} /></label>
                     <label><span style={labelStyle}>T/A Dia</span><input type="number" value={form.vitalSigns.dia} onChange={e => setForm(f => ({...f, vitalSigns: {...f.vitalSigns, dia: e.target.value}}))} style={inputStyle} /></label>
                     <label><span style={labelStyle}>FC</span><input type="number" value={form.vitalSigns.heartRate} onChange={e => setForm(f => ({...f, vitalSigns: {...f.vitalSigns, heartRate: e.target.value}}))} style={inputStyle} /></label>
                     <label><span style={labelStyle}>Temp</span><input type="number" value={form.vitalSigns.temp} onChange={e => setForm(f => ({...f, vitalSigns: {...f.vitalSigns, temp: e.target.value}}))} style={inputStyle} /></label>
                  </div>
                </div>

                {/* 📍 A) MÓDULO EXAMEN DE LA VISTA */}
                <EyeExamsPanel patientId={patientId} consultationId={consultationId} />

                {/* 3. BIOMICROSCOPÍA */}
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

                {/* 4. TONOMETRÍA */}
                <div>
                   <h3 style={{ color:"#fcd34d", borderBottom:"1px solid #fcd34d", paddingBottom:5 }}>4. Tonometría</h3>
                   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 15, background:"#292524", padding:15, borderRadius:8 }}>
                      <label><span style={{...labelStyle, color:"#fcd34d"}}>PIO OD</span><input type="number" value={form.exam.tonometry.od} onChange={e => setForm(f => ({...f, exam: {...f.exam, tonometry: {...f.exam.tonometry, od: e.target.value}}}))} style={inputStyle} /></label>
                      <label><span style={{...labelStyle, color:"#fcd34d"}}>PIO OS</span><input type="number" value={form.exam.tonometry.os} onChange={e => setForm(f => ({...f, exam: {...f.exam, tonometry: {...f.exam.tonometry, os: e.target.value}}}))} style={inputStyle} /></label>
                      <label><span style={labelStyle}>Hora</span><input type="time" value={form.exam.tonometry.time} onChange={e => setForm(f => ({...f, exam: {...f.exam, tonometry: {...f.exam.tonometry, time: e.target.value}}}))} style={inputStyle} /></label>
                      <label style={{gridColumn: "1/-1"}}><span style={labelStyle}>Medicamento / Gotas Aplicadas</span><input value={form.exam.tonometry.meds} onChange={e => setForm(f => ({...f, exam: {...f.exam, tonometry: {...f.exam.tonometry, meds: e.target.value}}}))} style={inputStyle} placeholder="Ej. Tetracaína, Timolol..." /></label>
                   </div>
                </div>

                {/* 5. FONDO DE OJO */}
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

                {/* 6. DIAGNÓSTICO Y PLAN */}
                <div>
                  <h3 style={{ color:"#a78bfa", borderBottom:"1px solid #a78bfa", paddingBottom:5 }}>6. Diagnóstico y Plan</h3>
                  <div style={{ display: "grid", gap: 15 }}>
                    <DiagnosisManager diagnoses={form.diagnoses} onChange={(newDx) => setForm(f => ({ ...f, diagnoses: newDx }))} />
                    <label style={{ fontSize: 12, color: "#666" }}>Notas Dx (Texto libre adicional)</label>
                    <textarea rows={1} value={form.diagnosis} onChange={(e) => setForm(f => ({ ...f, diagnosis: e.target.value }))} style={{...textareaStyle, background:"#111"}} />
                    <InterconsultationForm data={form.interconsultation} onChange={(newVal) => setForm(f => ({ ...f, interconsultation: newVal }))} />
                    <label style={{...labelStyle, marginTop:10}}>Tratamiento / Receta</label>
                    <PrescriptionBuilder onAdd={handleAddMed} />
                    {form.prescribedMeds.length > 0 && <div style={{ padding: 10, background: "#222", borderRadius: 6, border: "1px solid #444" }}>{form.prescribedMeds.map((m, i) => <div key={i} style={{ display: "flex", gap: 6, fontSize: 12, padding: 4 }}><span>💊 {m.productName}</span><button onClick={() => removeMedFromList(i)} style={{ color: "#f87171", border: "none", background: "none", cursor: "pointer" }}>✕</button></div>)}</div>}
                    <label style={labelStyle}>Plan / Indicaciones</label>
                    <textarea rows={6} value={form.treatment} onChange={(e) => setForm(f => ({ ...f, treatment: e.target.value }))} style={{ ...textareaStyle, fontFamily: "monospace" }} />
                  </div>
                </div>
              </div>
          </fieldset>
        </section>

        {/* --- SECCIÓN DE ADDENDUMS --- */}
        <section style={{ background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
            <h3 style={{ margin: "0 0 15px 0", color: "#fbbf24", borderBottom: "1px solid #fbbf24", paddingBottom: 5 }}>
                📝 Notas Adicionales (Addendums)
            </h3>
            
            {/* Lista de addendums existentes */}
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

            {/* Formulario de nuevo addendum */}
            <div style={{ background: "#111", padding: 15, borderRadius: 8, border: "1px dashed #555" }}>
                <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 5 }}>Agregar Nota de Evolución / Aclaración</label>
                <textarea 
                    rows={2} 
                    value={addendumText} 
                    onChange={e => setAddendumText(e.target.value)} 
                    placeholder="Escribe aquí información adicional posterior al cierre de la consulta..." 
                    style={{ ...textareaStyle, background: "#222" }} 
                />
                <div style={{textAlign:"right", marginTop:10}}>
                    <button onClick={handleAddAddendum} style={{ background: "#fbbf24", color: "black", border: "none", padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>
                        + Agregar Nota
                    </button>
                </div>
            </div>
        </section>

        {/* 📍 B) ESTUDIOS / GABINETE */}
        <StudiesPanel patientId={patientId} consultationId={consultationId} />

      </div>

      {showHistory && <HistoryModal logs={auditLogs} onClose={() => setShowHistory(false)} />}
    </div>
  );
}