import React, { useMemo, useState, useEffect } from "react";
import { 
  createAnamnesis, 
  deleteAnamnesis, 
  getAnamnesisByPatientId, 
  getLastAnamnesis 
} from "@/services/anamnesisStorage";
import { 
  getDiabetesMeds, updateDiabetesMeds, 
  getHypertensionMeds, updateHypertensionMeds 
} from "@/services/settingsStorage";

// --- LISTAS DE PADECIMIENTOS ---
const SYSTEMIC_LIST = [
  "Diabetes", "Hipertensión", "Artritis", "Tiroides", 
  "Cáncer", "Enf. Autoinmune", "Renal", "Cardiovascular", "Embarazo"
];

const OCULAR_LIST = [
  "Glaucoma", "Catarata", "Cirugía Ocular", "Trauma Ocular", 
  "Uso de Lentes de Contacto", "Ojo Seco", "Infecciones Recurrentes", 
  "Desprendimiento Retina"
];

const FAMILY_LIST = [
  "Diabetes (Fam)", "Hipertensión (Fam)", "Glaucoma (Fam)", 
  "Queratocono (Fam)", "Ceguera (Fam)", "Catarata (Fam)"
];

// --- UTILIDAD: CALCULAR EVOLUCIÓN ---
function calculateEvolution(dateStr) {
    if (!dateStr) return "";
    const start = new Date(dateStr);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < start.getDate())) {
        years--;
        months += 12;
    }
    if (years > 0) return `${years} año${years>1?'s':''} ${months>0 ? `${months} m` : ''}`;
    if (months > 0) return `${months} mes${months>1?'es':''}`;
    return "Reciente (<1 mes)";
}

// --- SUBCOMPONENTE: GESTOR DE CATÁLOGO ---
const CatalogManager = ({ mode, onClose, catalog, onUpdate }) => {
    const [newItem, setNewItem] = useState("");
    if (!mode) return null;

    const title = mode === "DIABETES" ? "Medicamentos Diabetes" : "Medicamentos Hipertensión";

    const handleAdd = () => {
        if (newItem && !catalog.includes(newItem)) {
            const next = [...catalog, newItem].sort();
            onUpdate(next);
            // Guardado persistente según el modo
            if (mode === "DIABETES") updateDiabetesMeds(next);
            if (mode === "HYPERTENSION") updateHypertensionMeds(next);
            setNewItem("");
        }
    };

    const handleDelete = (item) => {
        if (confirm(`¿Eliminar "${item}" del catálogo?`)) {
            const next = catalog.filter(i => i !== item);
            onUpdate(next);
            if (mode === "DIABETES") updateDiabetesMeds(next);
            if (mode === "HYPERTENSION") updateHypertensionMeds(next);
        }
    };

    return (
        <div style={{position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200}}>
            <div style={{background:"#1a1a1a", padding:20, borderRadius:10, width:400, border:"1px solid #60a5fa"}}>
                <h4 style={{marginTop:0, color:"#60a5fa"}}>Administrar: {title}</h4>
                <div style={{display:"flex", gap:10, marginBottom:15}}>
                    <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Nuevo medicamento..." style={{flex:1, padding:8, borderRadius:4, border:"1px solid #444", background:"#222", color:"white"}} />
                    <button onClick={handleAdd} style={{background:"#4ade80", color:"black", border:"none", borderRadius:4, fontWeight:"bold", padding:"0 12px"}}>+</button>
                </div>
                <div style={{maxHeight:300, overflowY:"auto", display:"grid", gap:5}}>
                    {catalog.map(item => (
                        <div key={item} style={{display:"flex", justifyContent:"space-between", padding:8, background:"#222", borderRadius:4, fontSize:13}}>
                            <span>{item}</span>
                            <button onClick={() => handleDelete(item)} style={{color:"#f87171", background:"none", border:"none", cursor:"pointer"}}>✕</button>
                        </div>
                    ))}
                </div>
                <div style={{textAlign:"right", marginTop:15}}>
                    <button onClick={onClose} style={{background:"#333", color:"white", border:"1px solid #555", padding:"6px 12px", borderRadius:4, cursor:"pointer"}}>Cerrar</button>
                </div>
            </div>
        </div>
    );
};

// --- SUBCOMPONENTE: FILA DE MEDICAMENTO ---
const MedsRow = ({ meds, onChange, catalog, onOpenCatalog, listId }) => {
    const addRow = () => onChange([...meds, { name: "", dose: "" }]);
    const updateRow = (idx, field, val) => {
        const next = [...meds];
        next[idx][field] = val;
        onChange(next);
    };
    const removeRow = (idx) => onChange(meds.filter((_, i) => i !== idx));

    return (
        <div style={{marginTop:10, padding:10, background:"rgba(0,0,0,0.2)", borderRadius:6}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5}}>
                <span style={{fontSize:11, color:"#aaa"}}>TRATAMIENTO ACTUAL</span>
                <div style={{display:"flex", gap:10}}>
                    <button type="button" onClick={onOpenCatalog} style={{fontSize:10, color:"#60a5fa", background:"none", border:"none", cursor:"pointer", textDecoration:"underline"}}>⚙️ Catálogo</button>
                    <button type="button" onClick={addRow} style={{fontSize:10, background:"#333", color:"#4ade80", border:"1px solid #4ade80", borderRadius:4, cursor:"pointer", padding:"2px 6px"}}>+ Fila</button>
                </div>
            </div>
            {meds.map((m, i) => (
                <div key={i} style={{display:"grid", gridTemplateColumns:"1.5fr 1fr auto", gap:5, marginBottom:5}}>
                    <input list={listId} placeholder="Medicamento" value={m.name} onChange={e => updateRow(i, "name", e.target.value)} style={inputStyleSmall} />
                    <input placeholder="Dosis (ej. 850mg c/12h)" value={m.dose} onChange={e => updateRow(i, "dose", e.target.value)} style={inputStyleSmall} />
                    <button type="button" onClick={() => removeRow(i)} style={{color:"#f87171", background:"none", border:"none", cursor:"pointer"}}>✕</button>
                </div>
            ))}
            <datalist id={listId}>{catalog.map(c => <option key={c} value={c} />)}</datalist>
        </div>
    );
};

export default function AnamnesisPanel({ patientId }) {
  const [tick, setTick] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  
  // GESTIÓN DE CATÁLOGOS
  const [catalogMode, setCatalogMode] = useState(null); // null, "DIABETES", "HYPERTENSION"
  const [diabetesCatalog, setDiabetesCatalog] = useState([]);
  const [hyperCatalog, setHyperCatalog] = useState([]);

  const [detailModal, setDetailModal] = useState(null);

  // ESTADOS DEL FORMULARIO BASE
  const [systemic, setSystemic] = useState({});
  const [ocular, setOcular] = useState({});
  const [family, setFamily] = useState({});
  const [extras, setExtras] = useState({ allergies: "", medications: "", observations: "" });

  // ESTADOS DETALLADOS
  const [diabetesData, setDiabetesData] = useState({ 
      diagnosisDate: "", evolution: "", maxVal: "", maxDate: "", stableDate: "", meds: [] 
  });
  const [hyperData, setHyperData] = useState({ 
      diagnosisDate: "", evolution: "", maxValSys: "", maxValDia: "", maxDate: "", lastTake: "", lastMeasureSys: "", lastMeasureDia: "", lastMeasureDate: "", meds: [] 
  });

  const historyList = useMemo(() => getAnamnesisByPatientId(patientId), [patientId, tick]);

  // Cargar catálogos al montar
  useEffect(() => {
      setDiabetesCatalog(getDiabetesMeds());
      setHyperCatalog(getHypertensionMeds());
  }, [catalogMode]); 

  // AUTO-CALCULAR EVOLUCIÓN
  useEffect(() => {
      if(diabetesData.diagnosisDate) setDiabetesData(d => ({...d, evolution: calculateEvolution(d.diagnosisDate)}));
  }, [diabetesData.diagnosisDate]);

  useEffect(() => {
      if(hyperData.diagnosisDate) setHyperData(d => ({...d, evolution: calculateEvolution(d.diagnosisDate)}));
  }, [hyperData.diagnosisDate]);

  const toggleCondition = (group, setGroup, key) => {
    setGroup(prev => {
      const current = prev[key] || { active: false, notes: "" };
      if (current.active) {
        const next = { ...prev };
        delete next[key];
        return next;
      } else {
        return { ...prev, [key]: { active: true, notes: "" } };
      }
    });
  };

  const updateNotes = (setGroup, key, text) => {
    setGroup(prev => ({ ...prev, [key]: { ...prev[key], active: true, notes: text } }));
  };

  const handleCloneLast = () => {
    const last = getLastAnamnesis(patientId);
    if (!last) return alert("No hay historial previo.");
    setSystemic(last.systemic || {});
    setOcular(last.ocular || {});
    setFamily(last.family || {});
    setExtras({ allergies: last.allergies||"", medications: last.medications||"", observations: last.observations||"" });
    
    if(last.systemic?.Diabetes?.details) setDiabetesData(last.systemic.Diabetes.details);
    if(last.systemic?.Hipertensión?.details) setHyperData(last.systemic.Hipertensión.details);
    
    setIsCreating(true);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    
    const finalSystemic = { ...systemic };
    // Guardar Diabetes con estructura
    if (finalSystemic["Diabetes"]?.active) {
        const medsTxt = diabetesData.meds.map(m => `${m.name} ${m.dose}`).join(", ");
        const summary = `Dx: ${diabetesData.diagnosisDate || "?"} (${diabetesData.evolution}). Tx: ${medsTxt || "Ninguno"}. Max: ${diabetesData.maxVal || "-"} mg/dL`;
        finalSystemic["Diabetes"] = { 
            active: true, 
            notes: summary,
            details: diabetesData 
        };
    }

    // Guardar Hipertensión con estructura
    if (finalSystemic["Hipertensión"]?.active) {
        const medsTxt = hyperData.meds.map(m => `${m.name} ${m.dose}`).join(", ");
        const summary = `Dx: ${hyperData.diagnosisDate || "?"} (${hyperData.evolution}). Tx: ${medsTxt || "Ninguno"}. Última: ${hyperData.lastMeasureSys}/${hyperData.lastMeasureDia}`;
        finalSystemic["Hipertensión"] = { 
            active: true, 
            notes: summary,
            details: hyperData 
        };
    }

    createAnamnesis({ patientId, systemic: finalSystemic, ocular, family, ...extras });
    
    setSystemic({}); setOcular({}); setFamily({});
    setExtras({ allergies: "", medications: "", observations: "" });
    setDiabetesData({ diagnosisDate: "", evolution: "", maxVal: "", maxDate: "", stableDate: "", meds: [] });
    setHyperData({ diagnosisDate: "", evolution: "", maxValSys: "", maxValDia: "", maxDate: "", lastTake: "", lastMeasureSys: "", lastMeasureDia: "", lastMeasureDate: "", meds: [] });
    
    setIsCreating(false);
    setTick(t => t + 1);
  };

  const onDelete = (id) => { if(confirm("¿Borrar?")) { deleteAnamnesis(id); setTick(t => t + 1); } };

  // --- RENDERIZADORES ---
  const ConditionRow = ({ label, dataGroup, setGroup }) => {
    const item = dataGroup[label] || { active: false, notes: "" };
    const isSpecial = label === "Diabetes" || label === "Hipertensión";

    return (
      <div style={{ borderBottom: "1px solid #333", paddingBottom: 6, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div onClick={() => toggleCondition(dataGroup, setGroup, label)} style={{ cursor: "pointer", width: 40, height: 20, borderRadius: 10, position: "relative", background: item.active ? "#4ade80" : "#444", transition: "all 0.2s" }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 2, left: item.active ? 22 : 2, transition: "all 0.2s" }} />
            </div>
            <div style={{ flex: 1, fontSize: 13, color: item.active ? "white" : "#888", fontWeight: item.active ? "bold" : "normal" }}>{label}</div>
            
            {item.active && !isSpecial && (
              <input placeholder="Tiempo / Control..." value={item.notes} onChange={e => updateNotes(setGroup, label, e.target.value)} style={{ width: "50%", background: "transparent", border: "none", borderBottom: "1px solid #60a5fa", color: "#60a5fa", fontSize: 12, padding: 2 }} autoFocus />
            )}
          </div>

          {/* FORMULARIO DIABETES */}
          {item.active && label === "Diabetes" && (
              <div style={{ marginTop: 10, padding: 10, background: "rgba(248, 113, 113, 0.1)", borderRadius: 6, borderLeft: "3px solid #f87171" }}>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10}}>
                      <label style={labelStyle}>Fecha Diagnóstico <input type="date" value={diabetesData.diagnosisDate} onChange={e => setDiabetesData({...diabetesData, diagnosisDate: e.target.value})} style={inputStyleSmall} /></label>
                      <label style={labelStyle}>Evolución <input value={diabetesData.evolution} readOnly style={{...inputStyleSmall, background:"transparent", border:"none", color:"#aaa"}} /></label>
                  </div>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
                      <label style={labelStyle}>Valor más alto (mg/dL) <input type="number" value={diabetesData.maxVal} onChange={e => setDiabetesData({...diabetesData, maxVal: e.target.value})} style={inputStyleSmall} /></label>
                      <label style={labelStyle}>Fecha del pico <input type="date" value={diabetesData.maxDate} onChange={e => setDiabetesData({...diabetesData, maxDate: e.target.value})} style={inputStyleSmall} /></label>
                  </div>
                  <div style={{marginTop:10}}>
                      <label style={labelStyle}>¿Cuándo se estabilizó? <input value={diabetesData.stableDate} onChange={e => setDiabetesData({...diabetesData, stableDate: e.target.value})} style={inputStyleSmall} placeholder="Fecha aprox o 'Hace X meses'" /></label>
                  </div>
                  
                  {/* Pasa el catálogo específico de Diabetes y listId único */}
                  <MedsRow 
                      meds={diabetesData.meds} 
                      onChange={m => setDiabetesData({...diabetesData, meds: m})} 
                      catalog={diabetesCatalog} 
                      onOpenCatalog={() => setCatalogMode("DIABETES")} 
                      listId="list-diabetes-meds"
                  />
              </div>
          )}

          {/* FORMULARIO HIPERTENSIÓN */}
          {item.active && label === "Hipertensión" && (
              <div style={{ marginTop: 10, padding: 10, background: "rgba(96, 165, 250, 0.1)", borderRadius: 6, borderLeft: "3px solid #60a5fa" }}>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10}}>
                      <label style={labelStyle}>Fecha Diagnóstico <input type="date" value={hyperData.diagnosisDate} onChange={e => setHyperData({...hyperData, diagnosisDate: e.target.value})} style={inputStyleSmall} /></label>
                      <label style={labelStyle}>Evolución <input value={hyperData.evolution} readOnly style={{...inputStyleSmall, background:"transparent", border:"none", color:"#aaa"}} /></label>
                  </div>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:5, alignItems:"end"}}>
                      <label style={labelStyle}>Pico Sys <input type="number" value={hyperData.maxValSys} onChange={e => setHyperData({...hyperData, maxValSys: e.target.value})} style={inputStyleSmall} /></label>
                      <label style={labelStyle}>Pico Dia <input type="number" value={hyperData.maxValDia} onChange={e => setHyperData({...hyperData, maxValDia: e.target.value})} style={inputStyleSmall} /></label>
                      <label style={labelStyle}>Fecha Pico <input type="date" value={hyperData.maxDate} onChange={e => setHyperData({...hyperData, maxDate: e.target.value})} style={inputStyleSmall} /></label>
                  </div>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:5, alignItems:"end", marginTop:10}}>
                      <label style={labelStyle}>Última Sys <input type="number" value={hyperData.lastMeasureSys} onChange={e => setHyperData({...hyperData, lastMeasureSys: e.target.value})} style={inputStyleSmall} /></label>
                      <label style={labelStyle}>Última Dia <input type="number" value={hyperData.lastMeasureDia} onChange={e => setHyperData({...hyperData, lastMeasureDia: e.target.value})} style={inputStyleSmall} /></label>
                      <label style={labelStyle}>Fecha <input type="date" value={hyperData.lastMeasureDate} onChange={e => setHyperData({...hyperData, lastMeasureDate: e.target.value})} style={inputStyleSmall} /></label>
                  </div>
                  <div style={{marginTop:10}}>
                      <label style={labelStyle}>Última Toma de Med. (Hora/Fecha) <input value={hyperData.lastTake} onChange={e => setHyperData({...hyperData, lastTake: e.target.value})} style={inputStyleSmall} /></label>
                  </div>
                  
                  {/* Pasa el catálogo específico de Hipertensión y listId único */}
                  <MedsRow 
                      meds={hyperData.meds} 
                      onChange={m => setHyperData({...hyperData, meds: m})} 
                      catalog={hyperCatalog} 
                      onOpenCatalog={() => setCatalogMode("HYPERTENSION")} 
                      listId="list-hyper-meds"
                  />
              </div>
          )}
      </div>
    );
  };

  // --- MODAL DE LECTURA DE DETALLES ---
  const DetailModal = ({ title, data, onClose }) => {
      if (!data) return null;
      return (
          <div style={{position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:150}}>
              <div style={{background:"#1a1a1a", padding:25, borderRadius:10, width:500, border:"1px solid #4ade80"}}>
                  <h3 style={{marginTop:0, color:"#4ade80"}}>{title} (Detalle)</h3>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:15, marginBottom:15}}>
                      <div><strong style={{color:"#aaa", fontSize:12}}>DIAGNÓSTICO</strong><div>{data.diagnosisDate} ({data.evolution})</div></div>
                      {data.stableDate && <div><strong style={{color:"#aaa", fontSize:12}}>ESTABILIZACIÓN</strong><div>{data.stableDate}</div></div>}
                      {data.maxVal && <div><strong style={{color:"#aaa", fontSize:12}}>PICO MÁXIMO</strong><div>{data.maxVal} mg/dL ({data.maxDate})</div></div>}
                      {(data.maxValSys || data.maxValDia) && <div><strong style={{color:"#aaa", fontSize:12}}>PICO MÁXIMO</strong><div>{data.maxValSys}/{data.maxValDia} ({data.maxDate})</div></div>}
                      {(data.lastMeasureSys || data.lastMeasureDia) && <div><strong style={{color:"#aaa", fontSize:12}}>ÚLTIMA MEDICIÓN</strong><div>{data.lastMeasureSys}/{data.lastMeasureDia} ({data.lastMeasureDate})</div></div>}
                      {data.lastTake && <div><strong style={{color:"#aaa", fontSize:12}}>ÚLTIMA TOMA</strong><div>{data.lastTake}</div></div>}
                  </div>
                  
                  <div style={{background:"#222", padding:10, borderRadius:6}}>
                      <strong style={{color:"#aaa", fontSize:12}}>TRATAMIENTO ACTUAL</strong>
                      {data.meds?.length > 0 ? (
                          <ul style={{margin:"5px 0 0 15px", padding:0}}>
                              {data.meds.map((m,i) => <li key={i}>{m.name} - {m.dose}</li>)}
                          </ul>
                      ) : <div style={{fontStyle:"italic", color:"#666"}}>Sin medicamentos registrados.</div>}
                  </div>

                  <div style={{textAlign:"right", marginTop:20}}>
                      <button onClick={onClose} style={{background:"#333", color:"white", border:"1px solid #555", padding:"8px 16px", borderRadius:6, cursor:"pointer"}}>Cerrar</button>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <section style={{ marginTop: 28, display: "grid", gap: 14, background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.2em", color: "#e5e7eb" }}>Anamnesis (Antecedentes)</h2>
        <div style={{display:"flex", gap:10}}>
           {historyList.length > 0 && !isCreating && <button onClick={handleCloneLast} style={{ fontSize: "0.9em", background: "#1e3a8a", color: "#bfdbfe", border: "1px solid #60a5fa", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>⚡ Copiar Anterior</button>}
           <button onClick={() => { setIsCreating(!isCreating); setSystemic({}); setOcular({}); setFamily({}); }} style={{ fontSize: "0.9em", background: isCreating ? "#333" : "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>{isCreating ? "Cancelar" : "+ Nuevo Registro"}</button>
        </div>
      </div>

      <CatalogManager 
          mode={catalogMode} // Pasa el modo ("DIABETES" o "HYPERTENSION")
          onClose={() => setCatalogMode(null)} 
          catalog={catalogMode === "DIABETES" ? diabetesCatalog : hyperCatalog} 
          onUpdate={catalogMode === "DIABETES" ? setDiabetesCatalog : setHyperCatalog} 
      />
      
      {detailModal && <DetailModal title={detailModal.title} data={detailModal.data} onClose={() => setDetailModal(null)} />}

      {isCreating && (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 20, background: "#111", padding: 20, borderRadius: 10, border: "1px dashed #555" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 30 }}>
            <div><h4 style={{ color: "#f87171", borderBottom: "1px solid #f87171", paddingBottom: 5, marginTop: 0 }}>1. Personales Patológicos</h4>{SYSTEMIC_LIST.map(label => <ConditionRow key={label} label={label} dataGroup={systemic} setGroup={setSystemic} />)}</div>
            <div><h4 style={{ color: "#60a5fa", borderBottom: "1px solid #60a5fa", paddingBottom: 5, marginTop: 0 }}>2. Oculares</h4>{OCULAR_LIST.map(label => <ConditionRow key={label} label={label} dataGroup={ocular} setGroup={setOcular} />)}</div>
            <div><h4 style={{ color: "#fbbf24", borderBottom: "1px solid #fbbf24", paddingBottom: 5, marginTop: 0 }}>3. Heredofamiliares</h4>{FAMILY_LIST.map(label => <ConditionRow key={label} label={label} dataGroup={family} setGroup={setFamily} />)}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
             <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#aaa" }}>Alergias</span><input value={extras.allergies} onChange={e => setExtras({...extras, allergies: e.target.value})} style={inputStyle} /></label>
             <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#aaa" }}>Otros Medicamentos (No listados)</span><input value={extras.medications} onChange={e => setExtras({...extras, medications: e.target.value})} style={inputStyle} /></label>
          </div>
          <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#aaa" }}>Observaciones Generales</span><textarea rows={2} value={extras.observations} onChange={e => setExtras({...extras, observations: e.target.value})} style={inputStyle} /></label>
          <button type="submit" style={{ background: "#4ade80", color: "black", border: "none", padding: "12px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: "1em" }}>Guardar Anamnesis</button>
        </form>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {historyList.map((entry) => {
           const hasSystemic = Object.keys(entry.systemic || {}).length > 0;
           const hasOcular = Object.keys(entry.ocular || {}).length > 0;
           return (
            <div key={entry.id} style={{ border: "1px solid #333", borderRadius: 8, padding: 15, background: "#111" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, borderBottom: "1px solid #222", paddingBottom: 5 }}>
                <strong style={{color:"#ddd"}}>{new Date(entry.createdAt).toLocaleDateString()}</strong>
                <button onClick={() => onDelete(entry.id)} style={{ fontSize: 11, background: "none", border: "none", color: "#666", cursor: "pointer" }}>Eliminar</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15, fontSize: "0.9em" }}>
                 {hasSystemic && (
                    <div>
                       <span style={{color: "#f87171", fontSize:11, fontWeight:"bold"}}>SISTÉMICOS:</span>
                       <ul style={{margin:"4px 0 0 15px", padding:0, color:"#ccc"}}>
                          {Object.entries(entry.systemic).map(([k, v]) => (
                              <li key={k}>
                                  {k} {v.notes && <span style={{color:"#888"}}>({v.notes})</span>}
                                  {v.details && <button onClick={() => setDetailModal({ title: k, data: v.details })} style={{marginLeft:5, fontSize:10, background:"#333", border:"1px solid #555", borderRadius:4, cursor:"pointer", color:"#bfdbfe"}}>Ver Detalle</button>}
                              </li>
                          ))}
                       </ul>
                    </div>
                 )}
                 {hasOcular && (
                    <div>
                       <span style={{color: "#60a5fa", fontSize:11, fontWeight:"bold"}}>OCULARES:</span>
                       <ul style={{margin:"4px 0 0 15px", padding:0, color:"#ccc"}}>{Object.entries(entry.ocular).map(([k, v]) => <li key={k}>{k} {v.notes && <span style={{color:"#888"}}>({v.notes})</span>}</li>)}</ul>
                    </div>
                 )}
                 <div>
                    {(entry.allergies || entry.medications) && <><span style={{color: "#fbbf24", fontSize:11, fontWeight:"bold"}}>OTROS:</span><div style={{marginTop:4, color:"#aaa"}}>{entry.allergies && <div>Alergias: {entry.allergies}</div>}{entry.medications && <div>Meds: {entry.medications}</div>}</div></>}
                 </div>
              </div>
            </div>
           )
        })}
      </div>
    </section>
  );
}

const labelStyle = { fontSize: 11, color: "#aaa", display: "block", marginBottom: 2 };
const inputStyle = { padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, width: "100%" };
const inputStyleSmall = { ...inputStyle, padding: "6px", fontSize: "0.9em" };