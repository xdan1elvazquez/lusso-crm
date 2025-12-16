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

// 📍 COMPONENTES (Lógica original)
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

// 🟢 NUEVOS COMPONENTES DE LÓGICA
import OphthalmologyExamForm from "@/components/consultation/OphthalmologyExamForm";
import AttachmentsPanel from "@/components/consultation/AttachmentsPanel";

// 📍 CONFIGURACIÓN
import { getEmptySystems, QUICK_DATA, ALICIA_TEMPLATES } from "@/utils/consultationConfig";
import { IPAS_EXTENDED_CONFIG } from "@/utils/ipasExtendedConfig";
import { getPhysicalExamDefaults } from "@/utils/physicalExamConfig";
import { getRegionalExamDefaults } from "@/utils/physicalExamRegionsConfig";
import { getNeuroDefaults } from "@/utils/physicalExamNeuroConfig";
import { getOphthalmoDefaults } from "@/utils/ophthalmologyConfig";

// 🟢 REFACTOR: Lógica de Dominio Extraída
import { generateClinicalSummaryText } from "@/domain/clinical/ClinicalSummary";

// 👇 UI KIT NUEVO
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ModalWrapper from "@/components/ui/ModalWrapper";
import LoadingState from "@/components/LoadingState";

function toDateInput(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

// Sub-componente para Chips rápidos (Refactorizado)
const QuickChip = ({ label, active, onClick }) => (
  <button 
    type="button" 
    onClick={onClick} 
    className={`
      px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border
      ${active 
        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" 
        : "bg-surfaceHighlight border-border text-textMuted hover:text-white hover:border-primary/50"
      }
    `}
  >
    {active ? "✓ " : "+ "}{label}
  </button>
);

// Sub-componente Historial (Refactorizado)
const HistoryModal = ({ logs, onClose }) => (
    <ModalWrapper title="📜 Auditoría de Cambios" onClose={onClose} width="600px">
        <div className="space-y-3">
            {logs.length === 0 && <p className="text-textMuted text-center py-4">No hay cambios registrados.</p>}
            {logs.map(log => (
                <div key={log.id} className={`p-3 rounded-lg bg-surface border-l-4 ${log.action==="VOID" ? "border-l-red-500" : "border-l-emerald-500"}`}>
                    <div className="flex justify-between text-sm font-bold text-white">
                        <span>{log.action} (v{log.version})</span>
                        <span className="text-xs font-normal text-textMuted">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-textMuted mt-1">Usuario: <span className="text-white">{log.user}</span></div>
                    {log.reason && <div className="text-xs text-amber-400 mt-1 italic">Motivo: "{log.reason}"</div>}
                </div>
            ))}
        </div>
        <div className="mt-6 flex justify-end">
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
    </ModalWrapper>
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
                    ophthalmologyExam: c.ophthalmologyExam || getOphthalmoDefaults(),
                    attachments: c.attachments || [],
                    
                    diagnoses: c.diagnoses || [],
                    diagnosis: c.diagnosis, 
                    interconsultation: c.interconsultation || { required: false, to: "", reason: "", urgency: "NORMAL", status: "PENDING" },
                    treatment: c.treatment, 
                    prescribedMeds: c.prescribedMeds, 
                    prognosis: c.prognosis || "",
                    notes: c.notes,
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

  // 🟢 REFACTOR: Ahora usamos la función importada
  const handleCopySummary = () => { const text = generateClinicalSummaryText(form); navigator.clipboard.writeText(text).then(() => alert("Resumen copiado.")); };

  const handlePrintClinicalNote = () => {
      const summaryText = generateClinicalSummaryText(form).replace(/\n/g, "<br/>"); 
      const date = new Date().toLocaleDateString();
      const dxHtml = form.diagnoses.length > 0 ? form.diagnoses.map(d => `<div><strong>${d.type === "PRINCIPAL" ? "Dx Principal:" : "Dx:"}</strong> ${d.name}</div>`).join("") : `<div>${form.diagnosis || "Sin diagnóstico."}</div>`;
      const win = window.open('', '', 'width=900,height=700');
      win.document.write(`<html><head><title>Nota</title><style>body{font-family:Arial;padding:40px;line-height:1.5}</style></head><body><h1>Nota Clínica</h1><div><strong>${patient?.firstName}</strong> - ${date}</div><hr/><div style="white-space:pre-wrap">${summaryText}</div><br/><div style="background:#eee;padding:10px">${dxHtml}</div><script>window.print();</script></body></html>`);
      win.document.close();
  };

  const handlePrintPrescription = () => { /* ... Lógica existente ... */ };

  if (loading) return <LoadingState />;
  if (!consultation || !form) return <div className="p-10 text-center text-textMuted">No se encontró información.</div>;

  return (
    <div className="page-container space-y-6">
      {/* HEADER NAVEGACIÓN */}
      <div className="mb-4">
        <Link to={`/patients/${patientId}`} className="text-sm text-textMuted hover:text-white transition-colors">← Volver al Paciente</Link>
        <div className="flex items-center gap-4 mt-2">
            <h1 className="text-3xl font-bold text-white">Consulta Oftalmológica <span className="text-textMuted text-xl font-normal">(v{consultation.version})</span></h1>
            <Badge color={consultation.status === "ACTIVE" ? "green" : "red"}>{consultation.status === "ACTIVE" ? "Activa" : "Anulada"}</Badge>
        </div>
      </div>

      {isLocked && <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl text-red-300 flex justify-between items-center">
          <div className="flex items-center gap-2"><span>🔒</span> Consulta Cerrada</div>
          <Button variant="danger" onClick={handleAdminUnlock} className="py-1 px-3 text-xs">Desbloquear</Button>
      </div>}

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-t-4 border-t-blue-500">
          
          {/* CABECERA DE ACCIONES */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 p-4 bg-surfaceHighlight/30 rounded-xl border border-border">
             <div className="flex items-center gap-3">
                <span className="text-textMuted text-sm font-bold uppercase">Fecha Atención:</span>
                <input 
                    type="date" 
                    disabled={isLocked} 
                    value={form.visitDate} 
                    onChange={(e) => setForm(f => ({ ...f, visitDate: e.target.value }))} 
                    className="bg-background border border-border rounded px-3 py-1 text-white focus:border-primary outline-none"
                />
             </div>
             <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setShowHistory(true)} title="Ver historial">📜 Historial</Button>
                <Button variant="secondary" onClick={handlePrintClinicalNote}>🖨️ Nota</Button>
                <Button variant="secondary" onClick={handlePrintPrescription}>🖨️ Receta</Button>
                {!isLocked && (
                    <Button onClick={onSaveConsultation} className="shadow-lg shadow-blue-500/20">💾 GUARDAR</Button>
                )}
             </div>
          </div>

          <fieldset disabled={isLocked} className="border-none p-0 m-0 disabled:opacity-80">
              <div className="space-y-8">
                
                {/* 1. INTERROGATORIO */}
                <div>
                  <h3 className="text-lg font-bold text-blue-400 border-b border-blue-500/30 pb-2 mb-4">1. Interrogatorio</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                      {QUICK_DATA.symptoms.map(sym => (
                          <QuickChip key={sym} label={sym} active={form.reason.includes(sym)} onClick={() => toggleSymptom(sym)} />
                      ))}
                  </div>
                  <textarea 
                    rows={1} 
                    value={form.reason} 
                    onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} 
                    className="w-full bg-background border border-border rounded-xl p-3 text-textMain focus:border-primary outline-none mb-4 resize-none"
                    placeholder="Motivo de consulta..." 
                  />
                  
                  <div className="space-y-2">
                      <select 
                        onChange={applyHistoryTemplate} 
                        className="bg-surfaceHighlight border border-border text-amber-400 text-xs rounded px-2 py-1 outline-none cursor-pointer hover:border-amber-400/50"
                      >
                          <option value="">⚡ Insertar Plantilla...</option>
                          {Object.keys(ALICIA_TEMPLATES).map(key => <option key={key} value={key}>{key}</option>)}
                      </select>
                      <textarea 
                        rows={4} 
                        value={form.history} 
                        onChange={(e) => setForm(f => ({ ...f, history: e.target.value }))} 
                        className="w-full bg-background border border-border rounded-xl p-3 text-textMain focus:border-primary outline-none leading-relaxed"
                        placeholder="Historia del padecimiento actual..." 
                      />
                  </div>
                </div>

                {/* IPAS */}
                <div className="bg-surfaceHighlight/20 p-4 rounded-xl border border-border">
                    <div className="flex justify-between items-center mb-4">
                        <h4 
                            className="text-amber-400 font-bold cursor-pointer flex items-center gap-2 select-none" 
                            onClick={() => setShowIPAS(!showIPAS)}
                        >
                            {showIPAS ? "▼" : "▶"} Interrogatorio por Aparatos y Sistemas (IPAS)
                        </h4>
                        <div className="flex gap-2">
                            <button type="button" onClick={handleCopySummary} className="text-xs bg-surface border border-blue-500/30 text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10">📋 Copiar</button>
                            <button type="button" onClick={handleAllSystemsNormal} className="text-xs bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-900/50">✓ Todo Negado</button>
                        </div>
                    </div>
                    {showIPAS && (
                        <div className="animate-fadeIn space-y-4">
                            <IPASNervousVisualForm data={form.systemsReview.nervousVisual || {}} onChange={(val) => setForm(prev => ({ ...prev, systemsReview: { ...prev.systemsReview, nervousVisual: val } }))} />
                            <IPASBlockForm title="📋 Otros Sistemas" config={IPAS_EXTENDED_CONFIG} data={form.systemsReview.extended || {}} onChange={(val) => setForm(prev => ({ ...prev, systemsReview: { ...prev.systemsReview, extended: val } }))} />
                        </div>
                    )}
                </div>

                {/* 2. EXPLORACIÓN FÍSICA Y NEURO */}
                <div>
                    <h3 className="text-lg font-bold text-purple-400 border-b border-purple-500/30 pb-2 mb-4">2. Exploración Física</h3>
                    <div className="space-y-4">
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
                </div>

                {/* 3. EXAMEN DE LA VISTA (RX) */}
                <EyeExamsPanel patientId={patientId} consultationId={consultationId} />

                {/* 4. OFTALMOLOGÍA ROBUSTA */}
                <div>
                   <OphthalmologyExamForm 
                      data={form.ophthalmologyExam}
                      onChange={(val) => setForm(prev => ({ ...prev, ophthalmologyExam: val }))}
                   />
                </div>

                {/* 5. IMPRESIÓN DIAGNÓSTICA */}
                <Card className="border-l-4 border-l-purple-500">
                    <h3 className="text-lg font-bold text-purple-400 mb-4">5. Impresión Diagnóstica</h3>
                    <div className="space-y-4">
                        <DiagnosisManager 
                            diagnoses={form.diagnoses} 
                            onChange={(newDx) => setForm(f => ({ ...f, diagnoses: newDx }))} 
                        />
                        
                        <div>
                            <label className="block text-xs font-bold text-textMuted uppercase mb-1">Notas diagnósticas complementarias:</label>
                            <textarea 
                                rows={2} 
                                value={form.diagnosis} 
                                onChange={(e) => setForm(f => ({ ...f, diagnosis: e.target.value }))} 
                                className="w-full bg-background border border-border rounded-xl p-3 text-textMain focus:border-primary outline-none"
                                placeholder="Descripción libre del diagnóstico..." 
                            />
                        </div>
                        
                        <InterconsultationForm 
                            data={form.interconsultation} 
                            onChange={(newVal) => setForm(f => ({ ...f, interconsultation: newVal }))} 
                        />
                    </div>
                </Card>

                {/* 6. PLAN TERAPÉUTICO */}
                <Card className="border-l-4 border-l-emerald-500">
                    <h3 className="text-lg font-bold text-emerald-400 mb-4">6. Plan Terapéutico</h3>
                    <div className="space-y-4">
                        <label className="block text-xs font-bold text-textMuted uppercase">Farmacoterapia (Receta):</label>
                        
                        <PrescriptionBuilder onAdd={handleAddMed} />
                        
                        {form.prescribedMeds.length > 0 && (
                            <div className="p-3 bg-surfaceHighlight/30 rounded-xl border border-border space-y-2">
                                {form.prescribedMeds.map((m, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                                        <span>💊 <strong>{m.productName}</strong>: {m.instructions}</span>
                                        <button onClick={() => removeMedFromList(i)} className="text-red-400 hover:text-red-300 font-bold px-2">✕</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-textMuted uppercase mb-1 mt-2">Indicaciones al Paciente:</label>
                            <textarea 
                                rows={4} 
                                value={form.treatment} 
                                onChange={(e) => setForm(f => ({ ...f, treatment: e.target.value }))} 
                                className="w-full bg-background border border-border rounded-xl p-3 text-textMain focus:border-primary outline-none font-mono text-sm"
                                placeholder="Indicaciones generales, cuidados, alarmas..."
                            />
                        </div>
                    </div>
                </Card>

                {/* 7. PRONÓSTICO */}
                <Card className="border-l-4 border-l-amber-500">
                    <h3 className="text-lg font-bold text-amber-400 mb-4">7. Pronóstico</h3>
                    <div className="flex flex-col md:flex-row gap-4">
                        <select 
                            value={["Bueno", "Malo", "Reservado"].includes(form.prognosis) ? form.prognosis : "OTRO"} 
                            onChange={(e) => {
                                const val = e.target.value;
                                setForm(f => ({ ...f, prognosis: val === "OTRO" ? "" : val }));
                            }} 
                            className="bg-background border border-border rounded-xl px-4 py-2 text-white focus:border-primary outline-none"
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
                            className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-white focus:border-primary outline-none"
                        />
                    </div>
                </Card>

                {/* 8. NOTA EVOLUTIVA (SOAP) */}
                <Card className="border-l-4 border-l-blue-500">
                    <h3 className="text-lg font-bold text-blue-400 mb-4">8. Nota Evolutiva (SOAP)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label>
                            <span className="block text-xs font-bold text-textMuted uppercase mb-1">S (Subjetivo)</span>
                            <textarea 
                                rows={3} 
                                placeholder="Refiere..."
                                value={form.soap?.s || ""}
                                onChange={e => setForm(f => ({...f, soap: {...f.soap, s: e.target.value}}))}
                                className="w-full bg-background border border-border rounded-xl p-3 text-textMain focus:border-primary outline-none resize-none"
                            />
                        </label>
                        <label>
                            <span className="block text-xs font-bold text-textMuted uppercase mb-1">O (Objetivo)</span>
                            <textarea 
                                rows={3} 
                                placeholder="Hallazgos..."
                                value={form.soap?.o || ""}
                                onChange={e => setForm(f => ({...f, soap: {...f.soap, o: e.target.value}}))}
                                className="w-full bg-background border border-border rounded-xl p-3 text-textMain focus:border-primary outline-none resize-none"
                            />
                        </label>
                        <label>
                            <span className="block text-xs font-bold text-textMuted uppercase mb-1">A (Análisis)</span>
                            <textarea 
                                rows={3} 
                                placeholder="Interpretación..."
                                value={form.soap?.a || ""}
                                onChange={e => setForm(f => ({...f, soap: {...f.soap, a: e.target.value}}))}
                                className="w-full bg-background border border-border rounded-xl p-3 text-textMain focus:border-primary outline-none resize-none"
                            />
                        </label>
                        <label>
                            <span className="block text-xs font-bold text-textMuted uppercase mb-1">P (Plan)</span>
                            <textarea 
                                rows={3} 
                                placeholder="Pasos..."
                                value={form.soap?.p || ""}
                                onChange={e => setForm(f => ({...f, soap: {...f.soap, p: e.target.value}}))}
                                className="w-full bg-background border border-border rounded-xl p-3 text-textMain focus:border-primary outline-none resize-none"
                            />
                        </label>
                    </div>
                </Card>

              </div>
          </fieldset>
        </Card>

        {/* ADJUNTOS */}
        <AttachmentsPanel 
           attachments={form.attachments}
           onUpdate={(newAttachments) => setForm(prev => ({ ...prev, attachments: newAttachments }))}
        />

        {/* NOTAS ADICIONALES */}
        <Card className="border-l-4 border-l-amber-500">
            <h3 className="text-lg font-bold text-amber-400 mb-4 border-b border-border pb-2">📝 Notas Adicionales (Addendums)</h3>
            {consultation.addendums && consultation.addendums.length > 0 ? (
                <div className="space-y-3 mb-6">
                    {consultation.addendums.map(add => (
                        <div key={add.id} className="bg-surfaceHighlight/30 p-3 rounded-lg border-l-2 border-amber-400">
                            <div className="text-xs text-textMuted mb-1">
                                {new Date(add.createdAt).toLocaleString()} por <strong className="text-white">{add.createdBy}</strong>
                            </div>
                            <div className="text-sm text-textMain whitespace-pre-wrap">{add.text}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-textMuted italic text-sm mb-6">No hay notas adicionales.</div>
            )}

            <div className="bg-background p-4 rounded-xl border border-dashed border-border">
                <label className="block text-xs font-bold text-textMuted uppercase mb-2">Agregar Nota de Evolución</label>
                <textarea 
                    rows={2} 
                    value={addendumText} 
                    onChange={e => setAddendumText(e.target.value)} 
                    placeholder="Escribe aquí información adicional posterior al cierre..." 
                    className="w-full bg-surface border border-border rounded-lg p-3 text-textMain focus:border-primary outline-none resize-none" 
                />
                <div className="text-right mt-3">
                    <Button onClick={handleAddAddendum} variant="secondary">Agregar Nota</Button>
                </div>
            </div>
        </Card>

        {/* ESTUDIOS (LEGACY) */}
        <StudiesPanel patientId={patientId} consultationId={consultationId} />

      </div>

      {showHistory && <HistoryModal logs={auditLogs} onClose={() => setShowHistory(false)} />}
    </div>
  );
}