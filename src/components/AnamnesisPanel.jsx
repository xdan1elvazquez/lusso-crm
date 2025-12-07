import React, { useState, useEffect, useMemo } from "react";
import { 
  createAnamnesis, 
  updateAnamnesis, 
  deleteAnamnesis, 
  getAnamnesisByPatientId 
} from "@/services/anamnesisStorage";
import { PATHOLOGICAL_CONFIG, LEGACY_MAPPING } from "@/utils/anamnesisConfig";
import { NON_PATHOLOGICAL_SECTIONS } from "@/utils/anamnesisNonPathConfig"; 
import { RELATIVES_CONFIG } from "@/utils/anamnesisFamilyConfig"; 
import { OCULAR_DISEASES } from "@/utils/anamnesisOcularConfig"; 

import SpecialDiseaseForm from "./SpecialDiseaseForm";
import FamilyHistoryForm from "./consultation/FamilyHistoryForm";
import OcularHistoryForm from "./consultation/OcularHistoryForm";

// 👇 UI Kit Nuevo
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import ModalWrapper from "@/components/ui/ModalWrapper";

// 👇 ESTA LÍNEA ES LA QUE FALTABA Y CAUSA EL ERROR
import LoadingState from "@/components/LoadingState";

// --- CALCULADORA DE VIGENCIA ---
const checkVigencia = (dateString) => {
    if (!dateString) return { months: 999, isExpired: true, label: "Sin fecha" };
    const date = new Date(dateString);
    const now = new Date();
    const months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    const isExpired = months >= 12;
    return { months, isExpired, label: isExpired ? `Vencida (${months} meses)` : `Vigente (${months === 0 ? "< 1 mes" : months + " meses"})` };
};

// --- COMPONENTES UI AUXILIARES ---
const Accordion = ({ title, isOpen, onToggle, children, activeCount }) => (
  <div className={`border border-border rounded-xl overflow-hidden mb-3 transition-colors ${isOpen ? "bg-surfaceHighlight/10 border-primary/30" : "bg-surface"}`}>
    <div 
        onClick={onToggle} 
        className="p-4 cursor-pointer flex justify-between items-center hover:bg-white/5 select-none transition-colors"
    >
      <div className="flex items-center gap-3">
          <span className={`font-bold text-sm ${isOpen ? "text-primary" : "text-white"}`}>{title}</span>
          {activeCount > 0 && <Badge color="green" className="text-[10px]">{activeCount} Datos</Badge>}
      </div>
      <span className="text-textMuted text-xs">{isOpen ? "▲" : "▼"}</span>
    </div>
    {isOpen && <div className="p-4 border-t border-border bg-black/20 animate-[fadeIn_0.2s_ease-out]">{children}</div>}
  </div>
);

const DynamicField = ({ field, value, onChange }) => {
    const val = value || "";
    
    if (field.type === "boolean") {
        return (
            <div className="mb-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                        type="checkbox" 
                        checked={value === true} 
                        onChange={e => onChange(e.target.checked)} 
                        className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                    />
                    <span className={`text-sm transition-colors ${value ? "text-white font-medium" : "text-textMuted group-hover:text-gray-300"}`}>{field.label}</span>
                </label>
            </div>
        );
    }

    if (field.type === "boolean_detail") { 
        const isChecked = val?.active === true; 
        return (
            <div className={`mb-3 pl-3 border-l-2 transition-all ${isChecked ? "border-amber-500" : "border-transparent"}`}>
                <label className="flex items-center gap-3 cursor-pointer group mb-2">
                    <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={e => onChange({ ...val, active: e.target.checked })} 
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <span className={`text-sm transition-colors ${isChecked ? "text-white font-medium" : "text-textMuted group-hover:text-gray-300"}`}>{field.label}</span>
                </label>
                {isChecked && (
                    <input 
                        placeholder={field.detailLabel || "Detalles..."} 
                        value={val?.detail || ""} 
                        onChange={e => onChange({ ...val, detail: e.target.value })} 
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none animate-[fadeIn_0.2s]"
                    />
                )}
            </div>
        ); 
    }

    if (field.type === "select") {
        return (
            <div className="mb-4" style={{ width: field.width || "100%" }}>
                <span className="block text-xs font-bold text-textMuted uppercase mb-1 ml-1">{field.label}</span>
                <select 
                    value={val} 
                    onChange={e => onChange(e.target.value)} 
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-white focus:border-primary outline-none appearance-none cursor-pointer"
                >
                    <option value="">-- Seleccionar --</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </div>
        );
    }

    if (field.type === "textarea") {
        return (
            <div className="mb-4">
                <span className="block text-xs font-bold text-textMuted uppercase mb-1 ml-1">{field.label}</span>
                <textarea 
                    rows={field.rows || 2} 
                    value={val} 
                    onChange={e => onChange(e.target.value)} 
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-white focus:border-primary outline-none resize-y"
                />
            </div>
        );
    }

    return (
        <div className="mb-4" style={{ width: field.width || "100%" }}>
            <Input 
                label={field.label}
                type={field.type==="number"?"number":field.type==="date"?"date":"text"}
                placeholder={field.placeholder||""} 
                value={val} 
                onChange={e => onChange(e.target.value)} 
                className="bg-surface"
            />
        </div>
    );
};

export default function AnamnesisPanel({ patientId }) {
  const [loading, setLoading] = useState(true);
  const [historyList, setHistoryList] = useState([]);
  
  const [viewAnamnesis, setViewAnamnesis] = useState(null); 

  const [formMode, setFormMode] = useState(null); 
  const [targetRecord, setTargetRecord] = useState(null); 
  const [summaryNote, setSummaryNote] = useState(""); 

  const [openSections, setOpenSections] = useState({ path: true, nonPath: false, ocular: false, fam: false });
  const [openSubSections, setOpenSubSections] = useState({});

  const [pathological, setPathological] = useState({});
  const [nonPathological, setNonPathological] = useState({});
  const [ocular, setOcular] = useState({});
  const [family, setFamily] = useState({});
  const [observations, setObservations] = useState("");

  const nonPathLabels = useMemo(() => {
      const map = {};
      if(NON_PATHOLOGICAL_SECTIONS) NON_PATHOLOGICAL_SECTIONS.forEach(sec => sec.fields.forEach(f => map[f.id] = f.label));
      return map;
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const data = await getAnamnesisByPatientId(patientId);
      setHistoryList(data || []);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { refreshData(); }, [patientId]);

  const latestRecord = useMemo(() => historyList.length > 0 ? historyList[0] : null, [historyList]);
  const vigencia = useMemo(() => checkVigencia(latestRecord?.updatedAt || latestRecord?.createdAt), [latestRecord]);

  const loadIntoForm = (record) => {
      const isLegacy = record.systemic && Object.keys(record.systemic).some(k => k === "Diabetes");
      if (isLegacy) {
        const newPath = {};
        Object.entries(record.systemic).forEach(([k,v]) => { if(v.active) newPath[LEGACY_MAPPING[k] || k.toLowerCase()] = { active: true, notes: v.notes }; });
        setPathological(newPath);
      } else {
        setPathological(record.pathological || {});
      }
      setNonPathological(record.nonPathological || {});
      setOcular(record.ocular || {});
      setFamily(record.family || {});
      setObservations(record.observations || "");
  };

  const handleEditLatest = () => { if(!latestRecord) return; loadIntoForm(latestRecord); setTargetRecord(latestRecord); setFormMode("UPDATE"); setSummaryNote(""); };
  const handleRenew = () => { if(!latestRecord) return; loadIntoForm(latestRecord); setTargetRecord(null); setFormMode("CREATE"); setSummaryNote("Actualización periódica"); };
  const handleNew = () => { setPathological({}); setNonPathological({}); setOcular({}); setFamily({}); setObservations(""); setTargetRecord(null); setFormMode("CREATE"); setSummaryNote("Apertura de expediente"); };
  
  const handleViewHistory = (record) => {
      setViewAnamnesis(record);
  };

  const handleCancel = () => { setFormMode(null); setTargetRecord(null); };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = { patientId, pathological, nonPathological, ocular, family, observations, summary: summaryNote };
    try {
        if (formMode === "UPDATE" && targetRecord?.id) {
            await updateAnamnesis(targetRecord.id, payload);
            alert("Registro actualizado correctamente.");
        } else if (formMode === "CREATE") {
            await createAnamnesis(payload);
            alert("Nueva versión de anamnesis creada.");
        }
        handleCancel();
        refreshData();
    } catch (err) { alert("Error al guardar: " + err.message); }
  };

  const onDelete = async (id) => { if(confirm("¿Borrar registro?")) { await deleteAnamnesis(id); refreshData(); } };

  // --- HELPERS CONTEO ---
  const countActivePath = (d) => d ? Object.values(d).filter(v => v && v.active).length : 0;
  const countActiveNonPath = (d) => {
      if (!d) return 0;
      let count = 0;
      Object.values(d).forEach(val => {
          if (val === true || (typeof val === 'object' && val?.active) || (typeof val === 'string' && val.length > 2)) count++;
      });
      return count;
  };
  const countActiveOcular = (d) => {
      if (!d) return 0;
      let count = 0;
      if (d.glasses?.uses) count++;
      if (d.contactLenses?.uses) count++;
      if (d.surgeries?.active) count++;
      if (d.trauma?.active) count++;
      if (d.diseases) Object.values(d.diseases).forEach(v => { if(v && v.active) count++; });
      return count;
  };
  const countActiveFam = (d) => {
      if (!d) return 0;
      let count = 0;
      if (d.relatives) Object.values(d.relatives).forEach(v => { if(v && !v.negated && v.vitalStatus) count++; });
      return count;
  };

  return (
    <Card className="border-t-4 border-t-amber-500 shadow-glow transition-all duration-300">
      
      {/* HEADER Y BOTONES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                Antecedentes Clínicos
            </h2>
            {latestRecord ? (
                <div className="mt-1">
                    <Badge color={vigencia.isExpired ? "red" : "green"}>
                        {vigencia.isExpired ? "⚠️" : "✅"} {vigencia.label} (v{latestRecord.version || 1})
                    </Badge>
                </div>
            ) : (
                <Badge color="gray" className="mt-1">Sin Historial</Badge>
            )}
        </div>

        {!formMode && (
            <div className="flex gap-2">
                {!latestRecord && <Button onClick={handleNew} variant="primary">+ Nuevo Historial</Button>}
                {latestRecord && vigencia.isExpired && <Button onClick={handleRenew} variant="primary" className="bg-amber-600 hover:bg-amber-700">↻ Renovar</Button>}
                {latestRecord && !vigencia.isExpired && <Button onClick={handleEditLatest} variant="ghost" className="border border-border">✎ Editar Vigente</Button>}
            </div>
        )}
      </div>

      {/* RENDERIZADO DE CARGA */}
      {loading ? (
        <div className="py-8">
            <LoadingState />
        </div>
      ) : (
        <>
            {/* FORMULARIO (EDICIÓN/CREACIÓN) */}
            {formMode && (
                <form onSubmit={onSubmit} className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                <div className={`p-4 rounded-xl border border-dashed flex justify-between items-center ${formMode==="UPDATE" ? "bg-emerald-900/10 border-emerald-500/30" : "bg-amber-900/10 border-amber-500/30"}`}>
                    <div className={`font-bold text-sm ${formMode==="UPDATE" ? "text-emerald-400" : "text-amber-400"}`}>
                        {formMode === "UPDATE" ? "EDITANDO REGISTRO VIGENTE" : "CREANDO NUEVA VERSIÓN"}
                    </div>
                    <Button onClick={handleCancel} variant="ghost" className="text-xs py-1 px-3 h-auto">Cancelar</Button>
                </div>

                {formMode === "CREATE" && (
                    <Input label="Motivo de actualización / Resumen" value={summaryNote} onChange={e => setSummaryNote(e.target.value)} placeholder="Ej. Revisión anual..." autoFocus />
                )}

                <Accordion title="1. Personales Patológicos" isOpen={openSections.path} onToggle={() => setOpenSections(p => ({...p, path: !p.path}))} activeCount={countActivePath(pathological)}>
                    {PATHOLOGICAL_CONFIG.map(cat => (
                        <div key={cat.id} className="mb-4 pl-3 border-l-2 border-border">
                        <div 
                                className="text-xs font-bold text-textMuted uppercase mb-3 cursor-pointer hover:text-white flex items-center gap-1"
                                onClick={() => setOpenSubSections(p => ({...p, [cat.id]: !p[cat.id]}))}
                        >
                                {openSubSections[cat.id] ? "▼" : "▶"} {cat.title}
                        </div>
                        
                        {openSubSections[cat.id] && cat.items.map(item => (
                            <div key={item.id} className="mb-2 animate-[fadeIn_0.1s]">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={pathological[item.id]?.active || false} 
                                        onChange={(e) => setPathological(prev => ({ ...prev, [item.id]: { ...prev[item.id], active: e.target.checked } }))} 
                                        className="w-4 h-4 accent-red-500 rounded"
                                    />
                                    <span className={`text-sm ${pathological[item.id]?.active ? "text-white font-medium" : "text-textMuted"}`}>{item.label}</span>
                                </label>
                                
                                {pathological[item.id]?.active && (
                                    <div className="ml-7 mt-2 animate-[fadeIn_0.2s]">
                                        {item.isSpecial ? (
                                            <SpecialDiseaseForm type={item.type} data={pathological[item.id]?.specialData || {}} onChange={(newData) => setPathological(prev => ({ ...prev, [item.id]: { active: true, specialData: newData } }))} />
                                        ) : (
                                            <input 
                                                placeholder="Detalles..." 
                                                value={pathological[item.id]?.notes || ""} 
                                                onChange={(e) => setPathological(prev => ({ ...prev, [item.id]: { active: true, notes: e.target.value } }))} 
                                                className="w-full bg-transparent border-b border-border text-sm text-white px-2 py-1 focus:border-primary outline-none"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        </div>
                    ))}
                </Accordion>

                <Accordion title="2. Personales No Patológicos" isOpen={openSections.nonPath} onToggle={() => setOpenSections(p => ({...p, nonPath: !p.nonPath}))} activeCount={countActiveNonPath(nonPathological)}>
                    <div className="grid gap-4">
                        {NON_PATHOLOGICAL_SECTIONS.map(section => (
                            <div key={section.id} className="bg-surfaceHighlight/20 p-4 rounded-xl border border-border/50">
                                <div 
                                    className="text-xs font-bold text-textMuted uppercase mb-3 cursor-pointer hover:text-white flex items-center gap-1"
                                    onClick={() => setOpenSubSections(p => ({...p, [section.id]: !p[section.id]}))}
                                >
                                    {openSubSections[section.id] ? "▼" : "▶"} {section.title}
                                </div>
                                {openSubSections[section.id] && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-[fadeIn_0.2s]">
                                        {section.fields.map(field => (
                                            <DynamicField key={field.id} field={field} value={nonPathological[field.id]} onChange={(val) => setNonPathological(prev => ({ ...prev, [field.id]: val }))} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </Accordion>

                <Accordion title="3. Antecedentes Oculares" isOpen={openSections.ocular} onToggle={() => setOpenSections(p => ({...p, ocular: !p.ocular}))} activeCount={countActiveOcular(ocular)}>
                    <OcularHistoryForm data={ocular} onChange={setOcular} />
                </Accordion>

                <Accordion title="4. Heredofamiliares" isOpen={openSections.fam} onToggle={() => setOpenSections(p => ({...p, fam: !p.fam}))} activeCount={countActiveFam(family)}>
                    <FamilyHistoryForm data={family} onChange={setFamily} />
                </Accordion>

                <div className="mt-4">
                    <label className="block text-xs font-bold text-textMuted uppercase mb-2">Observaciones Generales</label>
                    <textarea 
                        rows={3} 
                        value={observations} 
                        onChange={e => setObservations(e.target.value)} 
                        className="w-full bg-surface border border-border rounded-xl p-3 text-textMain focus:border-primary outline-none" 
                    />
                </div>

                <Button type="submit" variant={formMode==="UPDATE"?"primary":"primary"} className={`w-full py-3 ${formMode==="UPDATE"?"bg-emerald-600 hover:bg-emerald-700":"bg-amber-600 hover:bg-amber-700"}`}>
                    {formMode === "UPDATE" ? "Guardar Cambios" : "Guardar Nueva Versión"}
                </Button>
                </form>
            )}

            {/* --- LISTADO HISTÓRICO --- */}
            {!formMode && historyList.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border">
                    <div className="text-xs font-bold text-textMuted uppercase mb-4 tracking-wider">Historial de Versiones</div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {historyList.map((entry, index) => {
                            const isLatest = index === 0;
                            return (
                                <div 
                                    key={entry.id} 
                                    onClick={() => handleViewHistory(entry)} 
                                    className={`p-3 rounded-lg border flex justify-between items-center cursor-pointer transition-all group ${isLatest ? "bg-surface border-primary/30" : "bg-transparent border-border hover:bg-surfaceHighlight"}`}
                                >
                                    <div>
                                        <div className={`text-sm font-medium ${isLatest ? "text-white" : "text-textMuted group-hover:text-gray-300"}`}>
                                            Versión {entry.version || 1} {isLatest && <span className="text-xs text-emerald-400 font-bold ml-2">(Vigente)</span>}
                                        </div>
                                        <div className="text-xs text-textMuted opacity-70 mt-0.5">
                                            {new Date(entry.createdAt).toLocaleDateString()} · {entry.summary || "Sin resumen"}
                                        </div>
                                    </div>
                                    <span className="text-textMuted group-hover:text-white text-sm">Ver 👁️</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
      )}

      {/* --- MODAL LECTURA ESTRICTO --- */}
      {viewAnamnesis && (
        <ModalWrapper title={`Historial v${viewAnamnesis.version||1}`} onClose={()=>setViewAnamnesis(null)} width="700px">
           <div className="mb-4 text-xs text-textMuted">Creado: {new Date(viewAnamnesis.createdAt).toLocaleString()}</div>
           
           <div className="space-y-4">
                 {/* 1. Patológicos */}
                 {(() => {
                     const pathData = viewAnamnesis.pathological || viewAnamnesis.systemic || {};
                     const activeItems = Object.entries(pathData).filter(([_,v]) => v.active);
                     if (activeItems.length === 0) return null;
                     return (
                         <div className="border border-border rounded-lg p-4 bg-surface/50">
                            <strong className="text-sm text-red-400 block mb-2 uppercase tracking-wide">Patológicos</strong>
                            {activeItems.map(([k,v]) => (
                                <div key={k} className="text-sm text-textMuted mb-1">
                                    • <strong className="text-white capitalize">{k.replace(/_/g, ' ')}</strong>: {v.notes || (v.specialData ? "Datos detallados" : "")}
                                </div>
                            ))}
                         </div>
                     );
                 })()}

                 {/* 2. No Patológicos */}
                 {(() => {
                     if (!viewAnamnesis.nonPathological) return null;
                     const activeEntries = Object.entries(viewAnamnesis.nonPathological).filter(([k,v]) => {
                         if (!v || v === false) return false;
                         if (typeof v === 'object' && !v.active) return false;
                         return true;
                     });
                     if (activeEntries.length === 0) return null;
                     return (
                         <div className="border border-border rounded-lg p-4 bg-surface/50">
                            <strong className="text-sm text-blue-400 block mb-2 uppercase tracking-wide">No Patológicos</strong>
                            {activeEntries.map(([k,v]) => {
                                let valStr = typeof v === 'object' ? (v.detail || "Sí") : v;
                                const label = nonPathLabels[k] || k.replace(/_/g, ' ');
                                return <div key={k} className="text-sm text-textMuted mb-1">• <strong className="text-white">{label}:</strong> {valStr}</div>;
                            })}
                         </div>
                     );
                 })()}

                 {/* 3. Oculares */}
                 {(() => {
                     const d = viewAnamnesis.ocular || {};
                     const hasData = d.glasses?.uses || d.contactLenses?.uses || d.surgeries?.active || d.trauma?.active || Object.values(d.diseases || {}).some(x => x.active) || d.meds?.some(m => m.name);
                     if (!hasData) return null;
                     return (
                         <div className="border border-border rounded-lg p-4 bg-surface/50">
                            <strong className="text-sm text-emerald-400 block mb-2 uppercase tracking-wide">Oculares</strong>
                            {d.glasses?.uses && <div className="text-sm text-textMuted mb-1">• Usa Lentes {d.glasses.since ? `(Desde: ${d.glasses.since})` : ""}</div>}
                            {d.contactLenses?.uses && <div className="text-sm text-textMuted mb-1">• Usa Lentes de Contacto {d.contactLenses.type ? `(${d.contactLenses.type})` : ""}</div>}
                            {d.surgeries?.active && <div className="text-sm text-textMuted mb-1">• Cx Ocular: {d.surgeries.details}</div>}
                            {Object.entries(d.diseases || {}).filter(([_,v])=>v.active).map(([k,v]) => {
                                const diseaseName = OCULAR_DISEASES?.find(dis => dis.id === k)?.label || k;
                                return <div key={k} className="text-sm text-textMuted mb-1">• {diseaseName}: {v.notes || "Sí"}</div>
                            })}
                         </div>
                     );
                 })()}

                 {/* 4. Heredofamiliares */}
                 {(() => {
                     const d = viewAnamnesis.family || {};
                     const activeRelatives = Object.entries(d.relatives || {}).filter(([_,v]) => !v.negated);
                     if (activeRelatives.length === 0) return null;
                     return (
                         <div className="border border-border rounded-lg p-4 bg-surface/50">
                            <strong className="text-sm text-purple-400 block mb-2 uppercase tracking-wide">Heredofamiliares</strong>
                            {activeRelatives.map(([k,v]) => {
                                const relLabel = RELATIVES_CONFIG?.find(r => r.id === k)?.label || k;
                                return <div key={k} className="text-sm text-textMuted mb-1">• <strong className="text-white">{relLabel}:</strong> {v.vitalStatus === "DECEASED" ? "Finado" : "Vivo"} — {v.diseases || "Sin patologías"}</div>;
                            })}
                         </div>
                     );
                 })()}

                 {/* Observaciones */}
                 {viewAnamnesis.observations && (
                     <div className="p-4 bg-surfaceHighlight/30 rounded-lg border border-border">
                         <div className="text-xs font-bold text-textMuted uppercase mb-1">Observaciones</div>
                         <div className="text-sm text-white whitespace-pre-wrap">{viewAnamnesis.observations}</div>
                     </div>
                 )}
           </div>
           
           <div className="mt-6 flex justify-end">
               <Button variant="ghost" onClick={()=>setViewAnamnesis(null)}>Cerrar</Button>
           </div>
        </ModalWrapper>
      )}
    </Card>
  );
}