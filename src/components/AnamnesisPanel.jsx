import React, { useState, useEffect, useMemo } from "react";
import { 
  createAnamnesis, 
  deleteAnamnesis, 
  getAnamnesisByPatientId, 
  getLastAnamnesis 
} from "@/services/anamnesisStorage";
import { 
  PATHOLOGICAL_CONFIG, 
  NON_PATHOLOGICAL_LIST, 
  OCULAR_LIST, 
  FAMILY_LIST,
  LEGACY_MAPPING
} from "@/utils/anamnesisConfig";

// --- ESTILOS AUXILIARES ---
const styles = {
  sectionHeader: { background: "#262626", padding: "10px 15px", borderRadius: 6, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #404040", marginBottom: 5 },
  subHeader: { background: "#171717", padding: "8px 12px", borderRadius: 4, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: "3px solid #60a5fa", marginTop: 8, marginBottom: 5 },
  activeTag: { fontSize: "0.75em", background: "#064e3b", color: "#4ade80", padding: "2px 6px", borderRadius: 4, marginLeft: 10 },
  input: { width: "100%", padding: 8, background: "#111", border: "1px solid #444", color: "white", borderRadius: 4, fontSize: "0.9em" },
  label: { fontSize: "0.8em", color: "#aaa", display: "block", marginBottom: 2 },
  card: { background: "#111", border: "1px solid #333", borderRadius: 8, padding: 15, marginBottom: 10 }
};

// --- COMPONENTES UI PEQUEÑOS ---

const Accordion = ({ title, isOpen, onToggle, children, activeCount }) => (
  <div style={{ marginBottom: 5 }}>
    <div onClick={onToggle} style={styles.sectionHeader}>
      <span style={{fontWeight: "bold", color: isOpen ? "white" : "#ccc"}}>{title}</span>
      <div style={{display:"flex", alignItems:"center"}}>
        {activeCount > 0 && <span style={styles.activeTag}>{activeCount} Activos</span>}
        <span style={{marginLeft: 10, color: "#666"}}>{isOpen ? "▲" : "▼"}</span>
      </div>
    </div>
    {isOpen && <div style={{padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: 6}}>{children}</div>}
  </div>
);

const SubAccordion = ({ title, isOpen, onToggle, children }) => (
  <div>
    <div onClick={onToggle} style={styles.subHeader}>
      <span style={{fontSize: "0.95em", color: "#e5e7eb"}}>{title}</span>
      <span style={{fontSize: "0.8em", color: "#666"}}>{isOpen ? "▲" : "▼"}</span>
    </div>
    {isOpen && <div style={{paddingLeft: 10, paddingTop: 5}}>{children}</div>}
  </div>
);

// --- FORMULARIO ESPECIAL (DIABETES / HAS) ---
const SpecialDiseaseForm = ({ type, data, onChange }) => {
  // Inicializar estructura si está vacía
  const safeData = {
    diagnosisDate: "", evolution: "", maxValue: "", maxDate: "", controlStatus: "", 
    meds: [], ...data
  };

  const updateField = (field, val) => onChange({ ...safeData, [field]: val });

  const addMed = () => {
    onChange({ ...safeData, meds: [...safeData.meds, { id: Date.now(), name: "", dose: "", lastTake: "" }] });
  };

  const updateMed = (idx, field, val) => {
    const newMeds = [...safeData.meds];
    newMeds[idx][field] = val;
    onChange({ ...safeData, meds: newMeds });
  };

  const removeMed = (idx) => {
    onChange({ ...safeData, meds: safeData.meds.filter((_, i) => i !== idx) });
  };

  const labelColor = type === "DIABETES" ? "#f87171" : "#60a5fa";

  return (
    <div style={{ marginTop: 10, padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 6, borderLeft: `3px solid ${labelColor}` }}>
      <div style={{fontSize:"0.9em", color: labelColor, fontWeight:"bold", marginBottom:10}}>
        {type === "DIABETES" ? "🩸 Control Glucémico" : "❤️ Control Hipertensivo"}
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <label>
          <span style={styles.label}>Fecha Diagnóstico</span>
          <input type="date" value={safeData.diagnosisDate} onChange={e => updateField("diagnosisDate", e.target.value)} style={styles.input} />
        </label>
        <label>
          <span style={styles.label}>Evolución (Tiempo)</span>
          <input placeholder="Ej. 5 años" value={safeData.evolution} onChange={e => updateField("evolution", e.target.value)} style={styles.input} />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <label>
          <span style={styles.label}>{type === "DIABETES" ? "Glucosa Máxima" : "T/A Máxima"}</span>
          <input placeholder={type === "DIABETES" ? "mg/dL" : "mm/Hg"} value={safeData.maxValue} onChange={e => updateField("maxValue", e.target.value)} style={styles.input} />
        </label>
        <label>
          <span style={styles.label}>Fecha del Máximo</span>
          <input type="date" value={safeData.maxDate} onChange={e => updateField("maxDate", e.target.value)} style={styles.input} />
        </label>
      </div>

      <label style={{display:"block", marginBottom:10}}>
        <span style={styles.label}>Control Actual / Estabilización</span>
        <input placeholder="Ej. Controlado con dieta, estable desde 2020..." value={safeData.controlStatus} onChange={e => updateField("controlStatus", e.target.value)} style={styles.input} />
      </label>

      <div style={{background:"#000", padding:10, borderRadius:6}}>
        <div style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
          <span style={{fontSize:"0.8em", color:"#aaa"}}>Medicamentos</span>
          <button type="button" onClick={addMed} style={{fontSize:"0.75em", background:"#333", border:"none", color:"#4ade80", cursor:"pointer", padding:"2px 6px", borderRadius:4}}>+ Agregar</button>
        </div>
        {safeData.meds.length === 0 && <div style={{fontSize:"0.8em", color:"#555", fontStyle:"italic"}}>Sin medicamentos registrados.</div>}
        {safeData.meds.map((med, i) => (
          <div key={med.id} style={{display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 20px", gap:5, marginBottom:5}}>
            <input placeholder="Nombre" value={med.name} onChange={e => updateMed(i, "name", e.target.value)} style={{...styles.input, padding:4, fontSize:"0.8em"}} />
            <input placeholder="Dosis" value={med.dose} onChange={e => updateMed(i, "dose", e.target.value)} style={{...styles.input, padding:4, fontSize:"0.8em"}} />
            <input placeholder="Última toma" value={med.lastTake} onChange={e => updateMed(i, "lastTake", e.target.value)} style={{...styles.input, padding:4, fontSize:"0.8em"}} />
            <button type="button" onClick={() => removeMed(i)} style={{color:"#f87171", background:"none", border:"none", cursor:"pointer"}}>x</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- FILA DE CONDICIÓN GENÉRICA ---
const ConditionRow = ({ id, label, checked, notes, specialType, specialData, onChange }) => {
  return (
    <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px dashed #333" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input 
            type="checkbox" 
            checked={checked} 
            onChange={(e) => onChange(id, { active: e.target.checked })} 
            style={{ width: 16, height: 16, cursor: "pointer" }}
          />
          <span style={{ color: checked ? "white" : "#888", fontWeight: checked ? "bold" : "normal" }}>{label}</span>
        </div>
      </div>

      {checked && (
        <div style={{ marginLeft: 26, marginTop: 5, animation: "fadeIn 0.2s" }}>
          {specialType ? (
            <SpecialDiseaseForm 
              type={specialType} 
              data={specialData || {}} 
              onChange={(newData) => onChange(id, { active: true, specialData: newData })} 
            />
          ) : (
            <input 
              placeholder="Detalles, fecha, tratamiento..." 
              value={notes || ""} 
              onChange={(e) => onChange(id, { active: true, notes: e.target.value })} 
              style={{...styles.input, background:"transparent", border:"none", borderBottom:"1px solid #444", borderRadius:0}} 
            />
          )}
        </div>
      )}
    </div>
  );
};

export default function AnamnesisPanel({ patientId }) {
  const [loading, setLoading] = useState(true);
  const [historyList, setHistoryList] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [viewAnamnesis, setViewAnamnesis] = useState(null);

  // Estados de Acordeones
  const [openSections, setOpenSections] = useState({ path: true, nonPath: false, ocular: false, fam: false });
  const [openSubSections, setOpenSubSections] = useState({}); // Para categorías patológicas

  // Estado del Formulario
  const [pathological, setPathological] = useState({});
  const [nonPathological, setNonPathological] = useState({});
  const [ocular, setOcular] = useState({});
  const [family, setFamily] = useState({});
  const [observations, setObservations] = useState("");

  const refreshData = async () => {
    setLoading(true);
    try {
      const data = await getAnamnesisByPatientId(patientId);
      setHistoryList(data);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { refreshData(); }, [patientId]);

  // --- MIGRACIÓN DE DATOS VIEJOS ---
  const migrateLegacyData = (legacySystemic) => {
    const newPath = {};
    Object.entries(legacySystemic || {}).forEach(([key, val]) => {
      if (val.active) {
        // Mapear nombre viejo a ID nuevo o usar una categoría "otros"
        const newId = LEGACY_MAPPING[key] || "legacy_" + key.toLowerCase().replace(/\s/g, '_');
        
        // Si es especial (Diabetes/HAS) en legacy, intentamos preservar lo que se pueda
        if (key === "Diabetes" || key === "Hipertensión") {
           // En la versión anterior guardábamos details dentro de val.details
           newPath[newId] = { 
             active: true, 
             specialData: val.details || { controlStatus: val.notes } // Fallback a notas si no hay estructura
           };
        } else {
           newPath[newId] = { active: true, notes: val.notes || "" };
        }
      }
    });
    return newPath;
  };

  const handleCloneLast = async () => {
    try {
      const last = await getLastAnamnesis(patientId);
      if (!last) return alert("No hay historial previo.");
      
      // Detectar si es formato viejo (tiene keys con Mayúsculas directas como "Diabetes")
      const isLegacy = last.systemic && Object.keys(last.systemic).some(k => k === "Diabetes");
      
      if (isLegacy) {
        setPathological(migrateLegacyData(last.systemic));
      } else {
        setPathological(last.pathological || {});
      }

      setNonPathological(last.nonPathological || {});
      setOcular(last.ocular || {});
      setFamily(last.family || {});
      setObservations(last.observations || "");
      
      setIsCreating(true);
    } catch(e) { console.error(e); }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    // Validación Mínima para Diabetes/HAS
    if (pathological.diabetes?.active) {
       const d = pathological.diabetes.specialData || {};
       if (!d.diagnosisDate && !d.evolution) {
         if (!confirm("⚠️ Faltan datos clave de Diabetes (Fecha o Evolución). ¿Guardar de todos modos?")) return;
       }
    }
    if (pathological.has?.active) {
       const h = pathological.has.specialData || {};
       if (!h.diagnosisDate && !h.evolution) {
         if (!confirm("⚠️ Faltan datos clave de Hipertensión. ¿Guardar de todos modos?")) return;
       }
    }

    // Guardado (usando estructura nueva 'pathological', pero mantenemos 'systemic' vacío por compatibilidad si el backend lo requiere, o simplemente migramos el backend mentalmente a usar lo que le mandemos)
    // Nota: createAnamnesis guarda todo lo que le pasemos.
    await createAnamnesis({ 
        patientId, 
        pathological, // Nueva estructura
        nonPathological, 
        ocular, 
        family, 
        observations 
    });
    
    // Reset
    setPathological({}); setNonPathological({}); setOcular({}); setFamily({}); setObservations("");
    setIsCreating(false);
    refreshData();
  };

  const onDelete = async (id) => { if(confirm("¿Borrar registro?")) { await deleteAnamnesis(id); refreshData(); } };

  // --- RENDERIZADO RECURSIVO ---
  
  // Helper para contar activos en una sección
  const countActive = (dataObj) => Object.values(dataObj || {}).filter(v => v.active).length;

  return (
    <section style={{ marginTop: 28, display: "grid", gap: 14, background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.2em", color: "#e5e7eb" }}>Anamnesis ({historyList.length})</h2>
        <div style={{display:"flex", gap:10}}>
           {historyList.length > 0 && !isCreating && <button onClick={handleCloneLast} style={{ fontSize: "0.9em", background: "#1e3a8a", color: "#bfdbfe", border: "1px solid #60a5fa", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>⚡ Copiar Anterior</button>}
           <button onClick={() => { setIsCreating(!isCreating); setPathological({}); }} style={{ fontSize: "0.9em", background: isCreating ? "#333" : "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>{isCreating ? "Cancelar" : "+ Nuevo Registro"}</button>
        </div>
      </div>

      {/* --- VISUALIZADOR DE DETALLES (READ ONLY) --- */}
      {viewAnamnesis && (
        <div style={{position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", zIndex:300, display:"flex", justifyContent:"center", alignItems:"center"}}>
           <div style={{background:"#111", width:600, maxHeight:"80vh", overflowY:"auto", padding:20, borderRadius:10, border:"1px solid #444"}}>
              <h3 style={{marginTop:0, color:"#fbbf24"}}>Detalle Historial</h3>
              <div style={{marginBottom:15, color:"#888"}}>{new Date(viewAnamnesis.createdAt).toLocaleString()}</div>
              
              {/* Renderizado inteligente compatible con viejo y nuevo */}
              <div style={{display:"grid", gap:10}}>
                 {/* Patológicos (Nuevo vs Viejo) */}
                 {(viewAnamnesis.pathological || viewAnamnesis.systemic) && (
                    <div style={{border:"1px solid #333", padding:10, borderRadius:6}}>
                       <strong style={{color:"#f87171"}}>Patológicos</strong>
                       {Object.entries(viewAnamnesis.pathological || viewAnamnesis.systemic || {}).filter(([_,v])=>v.active).map(([k,v]) => (
                          <div key={k} style={{marginLeft:10, marginTop:5, fontSize:"0.9em"}}>
                             • <strong>{k}:</strong> {v.notes || (v.specialData ? "Datos detallados" : "")}
                             {v.specialData && <div style={{fontSize:"0.8em", color:"#aaa", marginLeft:10}}>
                                Dx: {v.specialData.diagnosisDate} | Control: {v.specialData.controlStatus}
                             </div>}
                          </div>
                       ))}
                    </div>
                 )}
                 {/* Oculares */}
                 {viewAnamnesis.ocular && (
                    <div style={{border:"1px solid #333", padding:10, borderRadius:6}}>
                       <strong style={{color:"#60a5fa"}}>Oculares</strong>
                       {Object.entries(viewAnamnesis.ocular || {}).filter(([_,v])=>v.active).map(([k,v]) => (
                          <div key={k} style={{marginLeft:10, fontSize:"0.9em"}}>• {k}: {v.notes}</div>
                       ))}
                    </div>
                 )}
              </div>
              <button onClick={()=>setViewAnamnesis(null)} style={{marginTop:20, width:"100%", padding:10, background:"#333", color:"white", border:"none", borderRadius:6, cursor:"pointer"}}>Cerrar</button>
           </div>
        </div>
      )}

      {/* --- FORMULARIO DE CREACIÓN --- */}
      {isCreating && (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, background: "#0a0a0a", padding: 15, borderRadius: 10, border: "1px dashed #555" }}>
          
          {/* 1. PERSONALES PATOLÓGICOS (CONFIG-DRIVEN) */}
          <Accordion title="1. Personales Patológicos" isOpen={openSections.path} onToggle={() => setOpenSections(p => ({...p, path: !p.path}))} activeCount={countActive(pathological)}>
             {PATHOLOGICAL_CONFIG.map(cat => (
                <SubAccordion 
                  key={cat.id} 
                  title={cat.title} 
                  isOpen={openSubSections[cat.id]} 
                  onToggle={() => setOpenSubSections(p => ({...p, [cat.id]: !p[cat.id]}))}
                >
                   {cat.items.map(item => (
                      <ConditionRow 
                        key={item.id}
                        id={item.id}
                        label={item.label}
                        checked={pathological[item.id]?.active || false}
                        notes={pathological[item.id]?.notes}
                        specialType={item.isSpecial ? item.type : null}
                        specialData={pathological[item.id]?.specialData}
                        onChange={(id, val) => setPathological(prev => ({ ...prev, [id]: { ...prev[id], ...val } }))}
                      />
                   ))}
                   <button type="button" onClick={() => {
                      // Botón "Limpiar Categoría"
                      const next = { ...pathological };
                      cat.items.forEach(i => delete next[i.id]);
                      setPathological(next);
                   }} style={{fontSize:"0.7em", color:"#666", background:"none", border:"none", cursor:"pointer", marginTop:5}}>Limpiar sección</button>
                </SubAccordion>
             ))}
          </Accordion>

          {/* 2. NO PATOLÓGICOS */}
          <Accordion title="2. No Patológicos" isOpen={openSections.nonPath} onToggle={() => setOpenSections(p => ({...p, nonPath: !p.nonPath}))} activeCount={countActive(nonPathological)}>
             {NON_PATHOLOGICAL_LIST.map(label => (
                <ConditionRow key={label} id={label} label={label} checked={nonPathological[label]?.active} notes={nonPathological[label]?.notes} 
                  onChange={(id, val) => setNonPathological(prev => ({ ...prev, [id]: { ...prev[id], ...val } }))} 
                />
             ))}
          </Accordion>

          {/* 3. OCULARES */}
          <Accordion title="3. Oculares" isOpen={openSections.ocular} onToggle={() => setOpenSections(p => ({...p, ocular: !p.ocular}))} activeCount={countActive(ocular)}>
             {OCULAR_LIST.map(label => (
                <ConditionRow key={label} id={label} label={label} checked={ocular[label]?.active} notes={ocular[label]?.notes} 
                  onChange={(id, val) => setOcular(prev => ({ ...prev, [id]: { ...prev[id], ...val } }))} 
                />
             ))}
          </Accordion>

          {/* 4. HEREDOFAMILIARES */}
          <Accordion title="4. Heredofamiliares" isOpen={openSections.fam} onToggle={() => setOpenSections(p => ({...p, fam: !p.fam}))} activeCount={countActive(family)}>
             {FAMILY_LIST.map(label => (
                <ConditionRow key={label} id={label} label={label} checked={family[label]?.active} notes={family[label]?.notes} 
                  onChange={(id, val) => setFamily(prev => ({ ...prev, [id]: { ...prev[id], ...val } }))} 
                />
             ))}
          </Accordion>

          <label style={{marginTop:10}}>
             <span style={styles.label}>Observaciones Generales</span>
             <textarea rows={2} value={observations} onChange={e => setObservations(e.target.value)} style={styles.input} />
          </label>

          <button type="submit" style={{ background: "#4ade80", color: "black", border: "none", padding: "12px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: "1em", marginTop: 10 }}>
             Guardar Expediente
          </button>
        </form>
      )}

      {/* --- LISTADO HISTÓRICO --- */}
      {loading ? <div style={{color:"#666", padding:20, textAlign:"center"}}>Cargando antecedentes...</div> : (
          <div style={{ display: "grid", gap: 10 }}>
            {historyList.map((entry) => {
               // Detectar si usa estructura nueva 'pathological' o vieja 'systemic'
               const pathData = entry.pathological || entry.systemic || {};
               const pathCount = countActive(pathData);
               const ocularCount = countActive(entry.ocular);

               return (
                <div key={entry.id} style={{ border: "1px solid #333", borderRadius: 8, padding: 15, background: "#111" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, borderBottom: "1px solid #222", paddingBottom: 5 }}>
                    <strong style={{color:"#ddd"}}>{new Date(entry.createdAt).toLocaleDateString()}</strong>
                    <div style={{display:"flex", gap:10}}>
                        <button onClick={() => setViewAnamnesis(entry)} style={{ fontSize: 12, background: "#1e3a8a", border: "none", color: "#bfdbfe", cursor: "pointer", padding:"2px 8px", borderRadius:4 }}>Ver Detalles 👁️</button>
                        <button onClick={() => onDelete(entry.id)} style={{ fontSize: 11, background: "none", border: "none", color: "#666", cursor: "pointer" }}>✕</button>
                    </div>
                  </div>
                  <div style={{fontSize:"0.85em", color:"#888"}}>
                      <div>Patológicos: {pathCount > 0 ? <span style={{color:"#f87171"}}>{pathCount} registros</span> : "Negados"}</div>
                      <div>Oculares: {ocularCount > 0 ? <span style={{color:"#60a5fa"}}>{ocularCount} registros</span> : "Negados"}</div>
                  </div>
                </div>
               );
            })}
          </div>
      )}
    </section>
  );
}