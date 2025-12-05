import React, { useState, useEffect, useMemo } from "react";
import { 
  createAnamnesis, 
  updateAnamnesis, 
  deleteAnamnesis, 
  getAnamnesisByPatientId, 
  getLastAnamnesis 
} from "@/services/anamnesisStorage";
import { PATHOLOGICAL_CONFIG, LEGACY_MAPPING } from "@/utils/anamnesisConfig";
import { NON_PATHOLOGICAL_SECTIONS } from "@/utils/anamnesisNonPathConfig"; //
import { RELATIVES_CONFIG } from "@/utils/anamnesisFamilyConfig"; //
import { OCULAR_DISEASES } from "@/utils/anamnesisOcularConfig"; //

import SpecialDiseaseForm from "./SpecialDiseaseForm";
import FamilyHistoryForm from "./consultation/FamilyHistoryForm";
import OcularHistoryForm from "./consultation/OcularHistoryForm";

const styles = {
  sectionHeader: { background: "#262626", padding: "10px 15px", borderRadius: 6, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #404040", marginBottom: 5 },
  activeTag: { fontSize: "0.75em", background: "#064e3b", color: "#4ade80", padding: "2px 6px", borderRadius: 4, marginLeft: 10 },
  input: { width: "100%", padding: 8, background: "#111", border: "1px solid #444", color: "white", borderRadius: 4, fontSize: "0.9em" },
  label: { fontSize: "0.8em", color: "#aaa", display: "block", marginBottom: 2 },
  checkboxRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  // Badges
  badge: { padding: "4px 8px", borderRadius: 4, fontSize: "0.75em", fontWeight: "bold", marginLeft: 10, display: "inline-flex", alignItems:"center", gap:5 },
  badgeValid: { background: "rgba(74, 222, 128, 0.1)", color: "#4ade80", border: "1px solid #4ade80" },
  badgeExpired: { background: "rgba(248, 113, 113, 0.1)", color: "#f87171", border: "1px solid #f87171" },
  badgeHistory: { background: "#333", color: "#aaa", border: "1px solid #555" }
};

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
  <div style={{ marginBottom: 5 }}>
    <div onClick={onToggle} style={styles.sectionHeader}>
      <span style={{fontWeight: "bold", color: isOpen ? "white" : "#ccc"}}>{title}</span>
      <div style={{display:"flex", alignItems:"center"}}>
        {activeCount > 0 && <span style={styles.activeTag}>{activeCount} Datos</span>}
        <span style={{marginLeft: 10, color: "#666"}}>{isOpen ? "▲" : "▼"}</span>
      </div>
    </div>
    {isOpen && <div style={{padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: 6}}>{children}</div>}
  </div>
);

const DynamicField = ({ field, value, onChange }) => {
    const val = value || "";
    if (field.type === "boolean") return <div style={{marginBottom: 10}}><label style={{display:"flex", alignItems:"center", gap:10, cursor:"pointer"}}><input type="checkbox" checked={value === true} onChange={e => onChange(e.target.checked)} /><span style={{color: value ? "white" : "#aaa"}}>{field.label}</span></label></div>;
    if (field.type === "boolean_detail") { const isChecked = val?.active === true; return <div style={{marginBottom: 10, borderLeft: isChecked ? "2px solid #fbbf24" : "2px solid transparent", paddingLeft: isChecked?8:0}}><label style={{display:"flex", alignItems:"center", gap:10, cursor:"pointer"}}><input type="checkbox" checked={isChecked} onChange={e => onChange({ ...val, active: e.target.checked })} /><span style={{color: isChecked ? "white" : "#aaa"}}>{field.label}</span></label>{isChecked && <input placeholder={field.detailLabel || "Detalles..."} value={val?.detail || ""} onChange={e => onChange({ ...val, detail: e.target.value })} style={{...styles.input, marginTop: 5, fontSize: "0.85em"}} />}</div>; }
    if (field.type === "select") return <label style={{display:"block", marginBottom: 10, width: field.width || "100%"}}><span style={styles.label}>{field.label}</span><select value={val} onChange={e => onChange(e.target.value)} style={styles.input}><option value="">-- Seleccionar --</option>{field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></label>;
    if (field.type === "textarea") return <label style={{display:"block", marginBottom: 10}}><span style={styles.label}>{field.label}</span><textarea rows={field.rows || 2} value={val} onChange={e => onChange(e.target.value)} style={{...styles.input, resize:"vertical"}} /></label>;
    return <label style={{display:"block", marginBottom: 10, width: field.width || "100%"}}><span style={styles.label}>{field.label}</span><input type={field.type==="number"?"number":field.type==="date"?"date":"text"} placeholder={field.placeholder||""} value={val} onChange={e => onChange(e.target.value)} style={styles.input} /></label>;
};

export default function AnamnesisPanel({ patientId }) {
  const [loading, setLoading] = useState(true);
  const [historyList, setHistoryList] = useState([]);
  
  // ESTADO QUE FALTABA O SE PERDIÓ:
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

  // Flattened labels para No Patológicos
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
    <section style={{ marginTop: 28, display: "grid", gap: 14, background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
      
      {/* HEADER Y BOTONES */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
            <h2 style={{ margin: 0, fontSize: "1.2em", color: "#e5e7eb", display: "inline-flex", alignItems: "center" }}>
                Antecedentes Clínicos
            </h2>
            {latestRecord ? (
                <span style={{ ...styles.badge, ...(vigencia.isExpired ? styles.badgeExpired : styles.badgeValid) }}>
                    {vigencia.isExpired ? "⚠️" : "✅"} {vigencia.label} (v{latestRecord.version || 1})
                </span>
            ) : (
                <span style={{ ...styles.badge, ...styles.badgeHistory }}>Sin Historial</span>
            )}
        </div>

        {!formMode && (
            <div style={{display:"flex", gap:10}}>
                {!latestRecord && <button onClick={handleNew} style={{ fontSize: "0.9em", background: "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight:"bold" }}>+ Nuevo Historial</button>}
                {latestRecord && vigencia.isExpired && <button onClick={handleRenew} style={{ fontSize: "0.9em", background: "#f59e0b", color: "black", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight:"bold" }}>↻ Renovar Anamnesis</button>}
                {latestRecord && !vigencia.isExpired && <button onClick={handleEditLatest} style={{ fontSize: "0.9em", background: "#333", color: "#fff", border: "1px solid #666", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>✎ Editar Vigente</button>}
            </div>
        )}
      </div>

      {/* FORMULARIO (EDICIÓN/CREACIÓN) */}
      {formMode && (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, background: "#0a0a0a", padding: 15, borderRadius: 10, border: `1px dashed ${formMode==="UPDATE" ? "#4ade80" : "#f59e0b"}`, position:"relative" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 10, borderBottom:"1px solid #333", paddingBottom:10 }}>
              <div style={{ color: formMode==="UPDATE" ? "#4ade80" : "#f59e0b", fontSize: "0.95em", fontWeight: "bold" }}>
                  {formMode === "UPDATE" ? "MODO EDICIÓN: Corrigiendo registro vigente" : "MODO ACTUALIZACIÓN: Creando nueva versión"}
              </div>
              <button type="button" onClick={handleCancel} style={{ fontSize: "0.8em", background: "transparent", color: "#aaa", border: "1px solid #555", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>Cancelar</button>
          </div>

          {formMode === "CREATE" && (
              <div style={{marginBottom:15}}>
                  <label style={styles.label}>Motivo de la actualización / Resumen</label>
                  <input autoFocus value={summaryNote} onChange={e => setSummaryNote(e.target.value)} style={styles.input} placeholder="Ej. Revisión anual, cambio de medicación..." />
              </div>
          )}

          <Accordion title="1. Personales Patológicos" isOpen={openSections.path} onToggle={() => setOpenSections(p => ({...p, path: !p.path}))} activeCount={countActivePath(pathological)}>
             {PATHOLOGICAL_CONFIG.map(cat => (
                <div key={cat.id} style={{marginBottom:10, borderLeft:"2px solid #333", paddingLeft:10}}>
                   <div style={{color:"#71717a", fontWeight:"bold", fontSize:"0.9em", marginBottom:5, cursor:"pointer"}} onClick={() => setOpenSubSections(p => ({...p, [cat.id]: !p[cat.id]}))}>{openSubSections[cat.id] ? "▼" : "▶"} {cat.title}</div>
                   {openSubSections[cat.id] && cat.items.map(item => (
                      <div key={item.id} style={{marginBottom:5}}>
                          <div style={styles.checkboxRow}><input type="checkbox" checked={pathological[item.id]?.active || false} onChange={(e) => setPathological(prev => ({ ...prev, [item.id]: { ...prev[item.id], active: e.target.checked } }))} /><span style={{color: pathological[item.id]?.active ? "white" : "#888"}}>{item.label}</span></div>
                          {pathological[item.id]?.active && (
                              <div style={{marginLeft: 26, animation:"fadeIn 0.2s"}}>
                                  {item.isSpecial ? <SpecialDiseaseForm type={item.type} data={pathological[item.id]?.specialData || {}} onChange={(newData) => setPathological(prev => ({ ...prev, [item.id]: { active: true, specialData: newData } }))} /> : <input placeholder="Detalles..." value={pathological[item.id]?.notes || ""} onChange={(e) => setPathological(prev => ({ ...prev, [item.id]: { active: true, notes: e.target.value } }))} style={{...styles.input, background:"transparent", borderBottom:"1px solid #444", borderTop:"none", borderLeft:"none", borderRight:"none", borderRadius:0}} />}
                              </div>
                          )}
                      </div>
                   ))}
                </div>
             ))}
          </Accordion>

          <Accordion title="2. Personales No Patológicos" isOpen={openSections.nonPath} onToggle={() => setOpenSections(p => ({...p, nonPath: !p.nonPath}))} activeCount={countActiveNonPath(nonPathological)}>
             <div style={{display:"grid", gap:15}}>
                 {NON_PATHOLOGICAL_SECTIONS.map(section => (
                     <div key={section.id} style={{background:"#161616", padding:12, borderRadius:8, border:"1px solid #333"}}>
                         <div style={{color:"#a1a1aa", fontWeight:"bold", fontSize:"0.95em", marginBottom:10, cursor:"pointer"}} onClick={() => setOpenSubSections(p => ({...p, [section.id]: !p[section.id]}))}>{openSubSections[section.id] ? "▼" : "▶"} {section.title}</div>
                         {openSubSections[section.id] && <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:15, animation:"fadeIn 0.2s"}}>{section.fields.map(field => <DynamicField key={field.id} field={field} value={nonPathological[field.id]} onChange={(val) => setNonPathological(prev => ({ ...prev, [field.id]: val }))} />)}</div>}
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

          <label style={{marginTop:10}}><span style={styles.label}>Observaciones Generales</span><textarea rows={3} value={observations} onChange={e => setObservations(e.target.value)} style={styles.input} /></label>
          <button type="submit" style={{ background: formMode==="UPDATE" ? "#4ade80" : "#f59e0b", color: "black", border: "none", padding: "12px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: "1em", marginTop: 10 }}>{formMode === "UPDATE" ? "Guardar Cambios" : "Guardar Nueva Versión"}</button>
        </form>
      )}

      {/* --- LISTADO HISTÓRICO --- */}
      {!formMode && historyList.length > 0 && (
          <div style={{ borderTop:"1px solid #333", paddingTop:15, marginTop:5 }}>
              <div style={{ fontSize: "0.9em", color: "#888", marginBottom: 10 }}>Historial de Versiones (Click para ver detalle)</div>
              <div style={{ display: "grid", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                  {historyList.map((entry, index) => {
                      const isLatest = index === 0;
                      return (
                          <div key={entry.id} onClick={() => handleViewHistory(entry)} style={{ display: "flex", justifyContent: "space-between", alignItems:"center", padding: "8px 12px", background: "#111", border: isLatest ? "1px solid #333" : "1px solid #222", borderRadius: 6, cursor: "pointer", opacity: isLatest ? 1 : 0.7 }}>
                              <div>
                                  <div style={{color: isLatest ? "#fff" : "#aaa", fontWeight: isLatest?"bold":"normal", fontSize:"0.9em"}}>
                                      Versión {entry.version || 1} {isLatest && <span style={{fontSize:"0.8em", color:"#4ade80", marginLeft:5}}>(Vigente)</span>}
                                  </div>
                                  <div style={{fontSize:"0.8em", color:"#666"}}>{new Date(entry.createdAt).toLocaleDateString()} · {entry.summary || "Sin resumen"}</div>
                              </div>
                              <span style={{fontSize:"1.2em", color:"#666"}}>👁️</span>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* --- MODAL LECTURA ESTRICTO (Solo lo que existe) --- */}
      {viewAnamnesis && (
        <div style={{position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", zIndex:300, display:"flex", justifyContent:"center", alignItems:"center"}}>
           <div style={{background:"#111", width:700, maxHeight:"85vh", overflowY:"auto", padding:25, borderRadius:10, border:"1px solid #444"}}>
              <h3 style={{marginTop:0, color:"#fbbf24"}}>Detalle Historial (v{viewAnamnesis.version||1})</h3>
              <div style={{marginBottom:15, color:"#888"}}>{new Date(viewAnamnesis.createdAt).toLocaleString()}</div>
              
              <div style={{display:"grid", gap:15}}>
                 
                 {/* 1. Patológicos (SOLO si hay activos) */}
                 {(() => {
                     // Lógica compatible con legacy 'systemic' y nuevo 'pathological'
                     const pathData = viewAnamnesis.pathological || viewAnamnesis.systemic || {};
                     const activeItems = Object.entries(pathData).filter(([_,v]) => v.active);
                     
                     if (activeItems.length === 0) return null;

                     return (
                         <div style={{border:"1px solid #333", padding:15, borderRadius:6}}>
                            <strong style={{color:"#f87171", display:"block", marginBottom:10}}>Patológicos</strong>
                            {activeItems.map(([k,v]) => (
                                <div key={k} style={{marginBottom:5, fontSize:"0.9em"}}>
                                    • <strong style={{textTransform:"capitalize"}}>{k.replace(/_/g, ' ')}</strong>: {v.notes || (v.specialData ? "Datos detallados" : "")}
                                </div>
                            ))}
                         </div>
                     );
                 })()}

                 {/* 2. No Patológicos (SOLO si tienen valor) */}
                 {(() => {
                     if (!viewAnamnesis.nonPathological) return null;
                     const activeEntries = Object.entries(viewAnamnesis.nonPathological).filter(([k,v]) => {
                         if (!v || v === false) return false;
                         if (typeof v === 'object' && !v.active) return false;
                         return true;
                     });

                     if (activeEntries.length === 0) return null;

                     return (
                         <div style={{border:"1px solid #333", padding:15, borderRadius:6}}>
                            <strong style={{color:"#60a5fa", display:"block", marginBottom:10}}>No Patológicos</strong>
                            {activeEntries.map(([k,v]) => {
                                let valStr = typeof v === 'object' ? (v.detail || "Sí") : v;
                                const label = nonPathLabels[k] || k.replace(/_/g, ' ');
                                return <div key={k} style={{fontSize:"0.9em"}}>• <strong>{label}:</strong> {valStr}</div>;
                            })}
                         </div>
                     );
                 })()}

                 {/* 3. Oculares (SOLO si hay positivos) */}
                 {(() => {
                     const d = viewAnamnesis.ocular || {};
                     const hasData = d.glasses?.uses || d.contactLenses?.uses || d.surgeries?.active || d.trauma?.active || Object.values(d.diseases || {}).some(x => x.active) || d.meds?.some(m => m.name) || d.symptoms?.some;
                     
                     if (!hasData && !d.glasses?.uses) return null; // Simple check

                     return (
                         <div style={{border:"1px solid #333", padding:15, borderRadius:6}}>
                            <strong style={{color:"#4ade80", display:"block", marginBottom:10}}>Oculares</strong>
                            
                            {d.glasses?.uses && <div style={{fontSize:"0.9em"}}>• Usa Lentes {d.glasses.since ? `(Desde: ${d.glasses.since})` : ""}</div>}
                            {d.contactLenses?.uses && <div style={{fontSize:"0.9em"}}>• Usa Lentes de Contacto {d.contactLenses.type ? `(${d.contactLenses.type})` : ""}</div>}
                            {d.surgeries?.active && <div style={{fontSize:"0.9em"}}>• Cx Ocular: {d.surgeries.details}</div>}
                            {d.trauma?.active && <div style={{fontSize:"0.9em"}}>• Trauma: {d.trauma.details}</div>}
                            
                            {Object.entries(d.diseases || {}).filter(([_,v])=>v.active).map(([k,v]) => {
                                const diseaseName = OCULAR_DISEASES?.find(dis => dis.id === k)?.label || k;
                                return <div key={k} style={{fontSize:"0.9em"}}>• {diseaseName}: {v.notes || "Sí"}</div>
                            })}

                            {d.meds?.[0]?.name && <div style={{fontSize:"0.9em"}}>• Gotas: {d.meds[0].name} {d.meds[0].dose}</div>}
                         </div>
                     );
                 })()}

                 {/* 4. Heredofamiliares (SOLO si no están negados) */}
                 {(() => {
                     const d = viewAnamnesis.family || {};
                     const activeRelatives = Object.entries(d.relatives || {}).filter(([_,v]) => !v.negated);
                     const activeOphthalmic = Object.entries(d.ophthalmic || {}).filter(([_,v]) => !v.negated);

                     if (activeRelatives.length === 0 && activeOphthalmic.length === 0) return null;

                     return (
                         <div style={{border:"1px solid #333", padding:15, borderRadius:6}}>
                            <strong style={{color:"#a78bfa", display:"block", marginBottom:10}}>Heredofamiliares</strong>
                            
                            {activeRelatives.map(([k,v]) => {
                                const relLabel = RELATIVES_CONFIG?.find(r => r.id === k)?.label || k;
                                return (
                                    <div key={k} style={{fontSize:"0.9em"}}>
                                        • <strong>{relLabel}:</strong> {v.vitalStatus === "DECEASED" ? "Finado" : "Vivo"} — {v.diseases || "Sin patologías reportadas"}
                                    </div>
                                );
                            })}

                            {activeOphthalmic.length > 0 && <div style={{marginTop:10, fontStyle:"italic", color:"#aaa", fontSize:"0.8em"}}>Antecedentes Oculares Familiares:</div>}
                            {activeOphthalmic.map(([k,v]) => {
                                const relLabel = RELATIVES_CONFIG?.find(r => r.id === k)?.label || k;
                                return <div key={`oph-${k}`} style={{fontSize:"0.9em"}}>• {relLabel}: {v.condition}</div>
                            })}
                         </div>
                     );
                 })()}

                 {/* Observaciones (Siempre mostrar si hay) */}
                 {viewAnamnesis.observations && (
                     <div style={{background:"#222", padding:10, borderRadius:6}}>
                         <div style={{color:"#aaa", fontSize:"0.8em"}}>OBSERVACIONES:</div>
                         <div>{viewAnamnesis.observations}</div>
                     </div>
                 )}
              </div>
              <button onClick={()=>setViewAnamnesis(null)} style={{marginTop:20, width:"100%", padding:10, background:"#333", color:"white", border:"none", borderRadius:6, cursor:"pointer"}}>Cerrar</button>
           </div>
        </div>
      )}
    </section>
  );
}