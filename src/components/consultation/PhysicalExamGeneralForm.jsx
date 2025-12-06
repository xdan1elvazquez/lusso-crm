// src/components/consultation/PhysicalExamGeneralForm.jsx
import React, { useState } from "react";
import { PE_GENERAL_CONFIG, GLASGOW_OPTS, getPhysicalExamDefaults } from "@/utils/physicalExamConfig";

const styles = {
  container: { border: "1px solid #444", borderRadius: 8, overflow: "hidden", marginBottom: 15 },
  header: { background: "#1f2937", padding: "10px 15px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" },
  blockContainer: { padding: 15, background: "#111", borderTop: "1px solid #333" },
  sectionTitle: { color: "#60a5fa", fontSize: "0.95em", borderBottom: "1px solid #333", paddingBottom: 5, marginBottom: 10, marginTop: 15 },
  grid: { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", marginBottom: 15 },
  label: { fontSize: "0.8em", color: "#aaa", display: "block", marginBottom: 3 },
  input: { width: "100%", padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, fontSize: "0.9em" },
  card: { background: "#1a1a1a", padding: 10, borderRadius: 6, border: "1px solid #333" },
  glasgowTotal: { fontSize: "1.2em", fontWeight: "bold", textAlign: "center", color: "#4ade80", marginTop: 15, background: "#064e3b", padding: 5, borderRadius: 4 },
  toggleRow: { display: "flex", flexWrap: "wrap", gap: 15, marginBottom: 10 }
};

export default function PhysicalExamGeneralForm({ data, onChange }) {
  const [isOpen, setIsOpen] = useState(true);
  const formData = data || getPhysicalExamDefaults();

  const updateSection = (section, field, value) => {
    const nextSection = { ...formData[section], [field]: value };
    
    // Auto-cálculo IMC
    if (section === "anthro" && (field === "peso" || field === "talla")) {
        const p = parseFloat(field === "peso" ? value : nextSection.peso);
        const t = parseFloat(field === "talla" ? value : nextSection.talla);
        if (p > 0 && t > 0) nextSection.imc = (p / (t * t)).toFixed(2);
    }

    // Auto-cálculo Glasgow
    if (section === "mental" && field === "glasgow") {
       nextSection.glasgow.total = parseInt(nextSection.glasgow.e) + parseInt(nextSection.glasgow.v) + parseInt(nextSection.glasgow.m);
    }

    onChange({ ...formData, [section]: nextSection });
  };

  const handleGlasgowChange = (component, val) => {
      const currentG = formData.mental?.glasgow || { e: 4, v: 5, m: 6, total: 15 };
      updateSection("mental", "glasgow", { ...currentG, [component]: parseInt(val) });
  };

  const handleOrientationChange = (key, checked) => {
      const current = formData.mental?.orientacion || { tiempo: true, espacio: true, persona: true };
      updateSection("mental", "orientacion", { ...current, [key]: checked });
  };

  const setAllNormal = () => {
      onChange(getPhysicalExamDefaults());
  };

  return (
    <div style={styles.container}>
        <div onClick={() => setIsOpen(!isOpen)} style={styles.header}>
            <div style={{fontWeight: "bold", color: "#e5e7eb"}}>1. Exploración Física General</div>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
                <button type="button" onClick={(e) => { e.stopPropagation(); setAllNormal(); }} style={{fontSize:11, padding:"2px 8px", background:"#333", border:"1px solid #555", color:"#ccc", borderRadius:4, cursor:"pointer"}}>Todo Normal</button>
                <span style={{color: "#aaa"}}>{isOpen ? "▼" : "▶"}</span>
            </div>
        </div>

        {isOpen && (
            <div style={styles.blockContainer}>
                
                {/* 1. SIGNOS VITALES */}
                <h4 style={{...styles.sectionTitle, marginTop:0}}>{PE_GENERAL_CONFIG.vitals.title}</h4>
                <div style={styles.grid}>
                    {PE_GENERAL_CONFIG.vitals.fields.map(f => (
                        <label key={f.id} style={{gridColumn: f.width > 80 ? "span 2" : "span 1"}}>
                            <span style={styles.label}>{f.label}</span>
                            <input type={f.type} value={formData.vitals?.[f.id] || ""} onChange={e => updateSection("vitals", f.id, e.target.value)} style={styles.input} placeholder={f.placeholder} />
                        </label>
                    ))}
                </div>

                {/* 2. ANTROPOMETRÍA */}
                <h4 style={styles.sectionTitle}>{PE_GENERAL_CONFIG.anthro.title}</h4>
                <div style={styles.grid}>
                    {PE_GENERAL_CONFIG.anthro.fields.map(f => (
                        <label key={f.id}>
                            <span style={styles.label}>{f.label}</span>
                            <input type={f.type} value={formData.anthro?.[f.id] || ""} onChange={e => updateSection("anthro", f.id, e.target.value)} style={{...styles.input, color: f.readOnly ? "#fbbf24" : "white"}} readOnly={f.readOnly} />
                        </label>
                    ))}
                </div>

                {/* 3. HABITUS */}
                <h4 style={styles.sectionTitle}>{PE_GENERAL_CONFIG.habitus.title}</h4>
                <div style={styles.grid}>
                    {PE_GENERAL_CONFIG.habitus.fields.map(f => (
                        <label key={f.id} style={{gridColumn: f.id==="dolor_aparente" ? "span 2" : "span 1"}}>
                            <span style={styles.label}>{f.label}</span>
                            {f.type === "select" ? (
                                <select value={formData.habitus?.[f.id] || f.default} onChange={e => updateSection("habitus", f.id, e.target.value)} style={styles.input}>
                                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            ) : f.type === "boolean" || f.type === "boolean_detail" ? (
                                <div>
                                    <div style={{display:"flex", alignItems:"center"}}>
                                        <input type="checkbox" checked={formData.habitus?.[f.id]?.active ?? formData.habitus?.[f.id]} onChange={e => updateSection("habitus", f.id, f.type==="boolean"? e.target.checked : { active: e.target.checked, detail: "" })} />
                                        <span style={{marginLeft:5, fontSize:"0.9em"}}>{(formData.habitus?.[f.id]?.active ?? formData.habitus?.[f.id]) ? "Sí" : "No"}</span>
                                    </div>
                                    {f.type === "boolean_detail" && formData.habitus?.[f.id]?.active && (
                                        <input placeholder={f.detailLabel} value={formData.habitus?.[f.id]?.detail || ""} onChange={e => updateSection("habitus", f.id, { active: true, detail: e.target.value })} style={{...styles.input, marginTop:5}} />
                                    )}
                                </div>
                            ) : (
                                <input value={formData.habitus?.[f.id] || f.default} onChange={e => updateSection("habitus", f.id, e.target.value)} style={styles.input} placeholder={f.placeholder} />
                            )}
                        </label>
                    ))}
                </div>

                {/* 4. MENTAL */}
                <h4 style={styles.sectionTitle}>{PE_GENERAL_CONFIG.mental.title}</h4>
                <div style={{display:"grid", gridTemplateColumns: "1fr 1fr", gap: 20}}>
                    <div style={styles.card}>
                        <div style={{fontSize:"0.9em", fontWeight:"bold", color:"#a78bfa", marginBottom:10}}>Escala de Glasgow</div>
                        <div style={{display:"grid", gap:8}}>
                            {["eye", "verbal", "motor"].map(k => (
                                <label key={k} style={styles.label}>{k.toUpperCase()}
                                    <select value={formData.mental?.glasgow?.[k.charAt(0)] || 4} onChange={e => handleGlasgowChange(k.charAt(0), e.target.value)} style={styles.input}>
                                        {GLASGOW_OPTS[k].map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                                    </select>
                                </label>
                            ))}
                            <div style={styles.glasgowTotal}>Total: {formData.mental?.glasgow?.total || 15} / 15</div>
                        </div>
                    </div>
                    <div>
                        <div style={{marginBottom:10}}>
                            <span style={styles.label}>Orientación (Marcar si está orientado)</span>
                            <div style={{display:"flex", gap:10, marginTop:5}}>
                                {PE_GENERAL_CONFIG.mental.orientation.map(o => (
                                    <label key={o.id} style={{cursor:"pointer", display:"flex", alignItems:"center", fontSize:"0.85em"}}>
                                        <input type="checkbox" checked={formData.mental?.orientacion?.[o.id] ?? true} onChange={e => handleOrientationChange(o.id, e.target.checked)} /> {o.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div style={{display:"grid", gap:8}}>
                            {PE_GENERAL_CONFIG.mental.functions.map(f => (
                                <label key={f.id}>
                                    <span style={styles.label}>{f.label}</span>
                                    {f.type === "select" ? (
                                        <select value={formData.mental?.[f.id] || f.default} onChange={e => updateSection("mental", f.id, e.target.value)} style={styles.input}>
                                            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : <input value={formData.mental?.[f.id] || f.default} onChange={e => updateSection("mental", f.id, e.target.value)} style={styles.input} />}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 5. PIEL Y FANERAS */}
                <h4 style={styles.sectionTitle}>{PE_GENERAL_CONFIG.skin.title}</h4>
                <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:20}}>
                    <div>
                        <div style={styles.grid}>
                            {PE_GENERAL_CONFIG.skin.skinFields.map(f => (
                                <label key={f.id}><span style={styles.label}>{f.label}</span><input value={formData.skin?.[f.id] || f.default} onChange={e => updateSection("skin", f.id, e.target.value)} style={styles.input} /></label>
                            ))}
                        </div>
                        <div style={styles.toggleRow}>
                            {PE_GENERAL_CONFIG.skin.skinToggles.map(t => {
                                const val = formData.skin?.[t.id] ?? t.default ?? false;
                                const isNormal = t.invertLogic ? val : !val; 
                                return (
                                    <label key={t.id} style={{display:"flex", alignItems:"center", gap:6, cursor:"pointer", background:"#222", padding:"4px 8px", borderRadius:4, border: isNormal ? "1px solid #444" : "1px solid #f87171"}}>
                                        <input type="checkbox" checked={val} onChange={e => updateSection("skin", t.id, e.target.checked)} />
                                        <span style={{fontSize:"0.85em", color: isNormal ? "#ddd" : "#f87171"}}>{t.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                        {(formData.skin?.lesiones || formData.skin?.detalles) && (
                            <input placeholder="Detalles de lesiones..." value={formData.skin?.detalles || ""} onChange={e => updateSection("skin", "detalles", e.target.value)} style={{...styles.input, marginTop:10}} />
                        )}
                    </div>
                    
                    <div style={{background:"#1a1a1a", padding:10, borderRadius:6}}>
                        <strong style={{fontSize:"0.9em", color:"#ccc", display:"block", marginBottom:10}}>Faneras</strong>
                        <div style={{display:"grid", gap:8}}>
                            {PE_GENERAL_CONFIG.skin.fanerasFields.map(f => (
                                <label key={f.id}><span style={styles.label}>{f.label}</span><input value={formData.skin?.[f.id] || f.default} onChange={e => updateSection("skin", f.id, e.target.value)} style={styles.input} /></label>
                            ))}
                            {PE_GENERAL_CONFIG.skin.hairFields.map(f => (
                                <label key={f.id}><span style={styles.label}>Cabello: {f.label}</span><input value={formData.skin?.hair?.[f.id] || f.default} onChange={e => updateSection("skin", "hair", {...formData.skin.hair, [f.id]: e.target.value})} style={styles.input} /></label>
                            ))}
                            <div style={{display:"flex", gap:10, marginTop:5}}>
                                {PE_GENERAL_CONFIG.skin.hairToggles.map(t => (
                                    <label key={t.id} style={{fontSize:"0.85em", display:"flex", gap:5, cursor:"pointer"}}>
                                        <input type="checkbox" checked={formData.skin?.[t.id] || false} onChange={e => updateSection("skin", t.id, e.target.checked)} />
                                        {t.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        )}
    </div>
  );
}