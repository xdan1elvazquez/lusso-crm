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

const SYSTEMIC_LIST = ["Diabetes", "Hipertensión", "Artritis", "Tiroides", "Cáncer", "Enf. Autoinmune", "Renal", "Cardiovascular", "Embarazo"];
const NON_PATHOLOGICAL_LIST = ["Tabaquismo", "Alcoholismo", "Toxicomanías", "Alimentación", "Actividad Física", "Inmunizaciones"];
const OCULAR_LIST = ["Glaucoma", "Catarata", "Cirugía Ocular", "Trauma Ocular", "Uso de Lentes de Contacto", "Ojo Seco", "Infecciones Recurrentes", "Desprendimiento Retina"];
const FAMILY_LIST = ["Diabetes (Fam)", "Hipertensión (Fam)", "Glaucoma (Fam)", "Queratocono (Fam)", "Ceguera (Fam)", "Catarata (Fam)"];

const labelStyle = { fontSize: 11, color: "#aaa", display: "block", marginBottom: 2 };
const inputStyle = { padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, width: "100%" };
const inputStyleSmall = { ...inputStyle, padding: "6px", fontSize: "0.9em" };

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

const CatalogManager = ({ mode, onClose, catalog, onUpdate }) => {
    const [newItem, setNewItem] = useState("");
    if (!mode) return null;
    const title = mode === "DIABETES" ? "Medicamentos Diabetes" : "Medicamentos Hipertensión";

    const handleAdd = async () => {
        if (newItem && !catalog.includes(newItem)) {
            const next = [...catalog, newItem].sort();
            onUpdate(next);
            if (mode === "DIABETES") await updateDiabetesMeds(next);
            if (mode === "HYPERTENSION") await updateHypertensionMeds(next);
            setNewItem("");
        }
    };

    const handleDelete = async (item) => {
        if (confirm(`¿Eliminar "${item}" del catálogo?`)) {
            const next = catalog.filter(i => i !== item);
            onUpdate(next);
            if (mode === "DIABETES") await updateDiabetesMeds(next);
            if (mode === "HYPERTENSION") await updateHypertensionMeds(next);
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
                    <input placeholder="Dosis" value={m.dose} onChange={e => updateRow(i, "dose", e.target.value)} style={inputStyleSmall} />
                    <button type="button" onClick={() => removeRow(i)} style={{color:"#f87171", background:"none", border:"none", cursor:"pointer"}}>✕</button>
                </div>
            ))}
            <datalist id={listId}>{catalog.map(c => <option key={c} value={c} />)}</datalist>
        </div>
    );
};

const ConditionRow = ({ label, dataGroup, setGroup, diabetesData, setDiabetesData, hyperData, setHyperData, diabetesCatalog, hyperCatalog, setCatalogMode }) => {
    const item = dataGroup[label] || { active: false, notes: "" };
    const isSpecial = label === "Diabetes" || label === "Hipertensión";

    return (
      <div style={{ borderBottom: "1px solid #333", paddingBottom: 6, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div onClick={() => {
                setGroup(prev => {
                  const current = prev[label] || { active: false, notes: "" };
                  if (current.active) { const next = { ...prev }; delete next[label]; return next; } 
                  else { return { ...prev, [label]: { active: true, notes: "" } }; }
                });
            }} style={{ cursor: "pointer", width: 40, height: 20, borderRadius: 10, position: "relative", background: item.active ? "#4ade80" : "#444", transition: "all 0.2s" }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 2, left: item.active ? 22 : 2, transition: "all 0.2s" }} />
            </div>
            <div style={{ flex: 1, fontSize: 13, color: item.active ? "white" : "#888", fontWeight: item.active ? "bold" : "normal" }}>{label}</div>
            
            {item.active && !isSpecial && (
              <input placeholder="Detalles..." value={item.notes} onChange={e => setGroup(prev => ({ ...prev, [label]: { ...prev[label], notes: e.target.value } }))} style={{ width: "50%", background: "transparent", border: "none", borderBottom: "1px solid #60a5fa", color: "#60a5fa", fontSize: 12, padding: 2 }} autoFocus />
            )}
          </div>

          {item.active && label === "Diabetes" && (
              <div style={{ marginTop: 10, padding: 10, background: "rgba(248, 113, 113, 0.1)", borderRadius: 6, borderLeft: "3px solid #f87171" }}>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10}}>
                      <label style={labelStyle}>Fecha Diagnóstico <input type="date" value={diabetesData.diagnosisDate} onChange={e => setDiabetesData({...diabetesData, diagnosisDate: e.target.value})} style={inputStyleSmall} /></label>
                      <label style={labelStyle}>Evolución <input value={diabetesData.evolution} readOnly style={{...inputStyleSmall, background:"transparent", border:"none", color:"#aaa"}} /></label>
                  </div>
                  <MedsRow meds={diabetesData.meds} onChange={m => setDiabetesData({...diabetesData, meds: m})} catalog={diabetesCatalog} onOpenCatalog={() => setCatalogMode("DIABETES")} listId="list-diabetes-meds"/>
              </div>
          )}

          {item.active && label === "Hipertensión" && (
              <div style={{ marginTop: 10, padding: 10, background: "rgba(96, 165, 250, 0.1)", borderRadius: 6, borderLeft: "3px solid #60a5fa" }}>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10}}>
                      <label style={labelStyle}>Fecha Diagnóstico <input type="date" value={hyperData.diagnosisDate} onChange={e => setHyperData({...hyperData, diagnosisDate: e.target.value})} style={inputStyleSmall} /></label>
                      <label style={labelStyle}>Evolución <input value={hyperData.evolution} readOnly style={{...inputStyleSmall, background:"transparent", border:"none", color:"#aaa"}} /></label>
                  </div>
                  <MedsRow meds={hyperData.meds} onChange={m => setHyperData({...hyperData, meds: m})} catalog={hyperCatalog} onOpenCatalog={() => setCatalogMode("HYPERTENSION")} listId="list-hyper-meds"/>
              </div>
          )}
      </div>
    );
};

export default function AnamnesisPanel({ patientId }) {
  const [loading, setLoading] = useState(true);
  const [historyList, setHistoryList] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  
  const [catalogMode, setCatalogMode] = useState(null);
  const [diabetesCatalog, setDiabetesCatalog] = useState([]);
  const [hyperCatalog, setHyperCatalog] = useState([]);

  const [systemic, setSystemic] = useState({});
  const [nonPathological, setNonPathological] = useState({});
  const [ocular, setOcular] = useState({});
  const [family, setFamily] = useState({});
  const [extras, setExtras] = useState({ allergies: "", medications: "", observations: "" });

  const [diabetesData, setDiabetesData] = useState({ diagnosisDate: "", evolution: "", maxVal: "", maxDate: "", stableDate: "", meds: [] });
  const [hyperData, setHyperData] = useState({ diagnosisDate: "", evolution: "", maxValSys: "", maxValDia: "", maxDate: "", lastTake: "", lastMeasureSys: "", lastMeasureDia: "", lastMeasureDate: "", meds: [] });

  const refreshData = async () => {
      setLoading(true);
      try {
          const data = await getAnamnesisByPatientId(patientId);
          setHistoryList(data);
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => { refreshData(); }, [patientId]);

  useEffect(() => {
      async function loadCats() {
          const [dMeds, hMeds] = await Promise.all([getDiabetesMeds(), getHypertensionMeds()]);
          setDiabetesCatalog(dMeds);
          setHyperCatalog(hMeds);
      }
      loadCats();
  }, [catalogMode]);

  useEffect(() => { if(diabetesData.diagnosisDate) setDiabetesData(d => ({...d, evolution: calculateEvolution(d.diagnosisDate)})); }, [diabetesData.diagnosisDate]);
  useEffect(() => { if(hyperData.diagnosisDate) setHyperData(d => ({...d, evolution: calculateEvolution(d.diagnosisDate)})); }, [hyperData.diagnosisDate]);

  const handleCloneLast = async () => {
    try {
        const last = await getLastAnamnesis(patientId);
        if (!last) return alert("No hay historial previo.");
        
        setSystemic(last.systemic || {});
        setNonPathological(last.nonPathological || {});
        setOcular(last.ocular || {});
        setFamily(last.family || {});
        setExtras({ allergies: last.allergies||"", medications: last.medications||"", observations: last.observations||"" });
        
        if(last.systemic?.Diabetes?.details) setDiabetesData(last.systemic.Diabetes.details);
        if(last.systemic?.Hipertensión?.details) setHyperData(last.systemic.Hipertensión.details);
        
        setIsCreating(true);
    } catch(e) {
        console.error(e);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    const finalSystemic = { ...systemic };
    if (finalSystemic["Diabetes"]?.active) {
        const medsTxt = diabetesData.meds.map(m => `${m.name} ${m.dose}`).join(", ");
        const summary = `Dx: ${diabetesData.diagnosisDate || "?"} (${diabetesData.evolution}). Tx: ${medsTxt || "Ninguno"}`;
        finalSystemic["Diabetes"] = { active: true, notes: summary, details: diabetesData };
    }

    if (finalSystemic["Hipertensión"]?.active) {
        const medsTxt = hyperData.meds.map(m => `${m.name} ${m.dose}`).join(", ");
        const summary = `Dx: ${hyperData.diagnosisDate || "?"} (${hyperData.evolution}). Tx: ${medsTxt || "Ninguno"}`;
        finalSystemic["Hipertensión"] = { active: true, notes: summary, details: hyperData };
    }

    await createAnamnesis({ 
        patientId, 
        systemic: finalSystemic, 
        nonPathological, 
        ocular, 
        family, 
        ...extras 
    });
    
    setSystemic({}); setNonPathological({}); setOcular({}); setFamily({});
    setExtras({ allergies: "", medications: "", observations: "" });
    setDiabetesData({ diagnosisDate: "", evolution: "", maxVal: "", maxDate: "", stableDate: "", meds: [] });
    setHyperData({ diagnosisDate: "", evolution: "", maxValSys: "", maxValDia: "", maxDate: "", lastTake: "", lastMeasureSys: "", lastMeasureDia: "", lastMeasureDate: "", meds: [] });
    
    setIsCreating(false);
    refreshData();
  };

  const onDelete = async (id) => { 
      if(confirm("¿Borrar?")) { 
          await deleteAnamnesis(id); 
          refreshData(); 
      } 
  };

  return (
    <section style={{ marginTop: 28, display: "grid", gap: 14, background: "#1a1a1a", padding: 20, borderRadius: 12, border: "1px solid #333" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.2em", color: "#e5e7eb" }}>Anamnesis ({historyList.length})</h2>
        <div style={{display:"flex", gap:10}}>
           {historyList.length > 0 && !isCreating && <button onClick={handleCloneLast} style={{ fontSize: "0.9em", background: "#1e3a8a", color: "#bfdbfe", border: "1px solid #60a5fa", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>⚡ Copiar Anterior</button>}
           <button onClick={() => { setIsCreating(!isCreating); setSystemic({}); setNonPathological({}); setOcular({}); setFamily({}); }} style={{ fontSize: "0.9em", background: isCreating ? "#333" : "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>{isCreating ? "Cancelar" : "+ Nuevo Registro"}</button>
        </div>
      </div>

      <CatalogManager mode={catalogMode} onClose={() => setCatalogMode(null)} catalog={catalogMode === "DIABETES" ? diabetesCatalog : hyperCatalog} onUpdate={catalogMode === "DIABETES" ? setDiabetesCatalog : setHyperCatalog} />
      
      {isCreating && (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 20, background: "#111", padding: 20, borderRadius: 10, border: "1px dashed #555" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 30 }}>
            <div>
                <h4 style={{ color: "#f87171", borderBottom: "1px solid #f87171", paddingBottom: 5, marginTop: 0 }}>1. Personales Patológicos</h4>
                {SYSTEMIC_LIST.map(label => <ConditionRow key={label} label={label} dataGroup={systemic} setGroup={setSystemic} diabetesData={diabetesData} setDiabetesData={setDiabetesData} hyperData={hyperData} setHyperData={setHyperData} diabetesCatalog={diabetesCatalog} hyperCatalog={hyperCatalog} setCatalogMode={setCatalogMode} />)}
            </div>
            <div>
                <h4 style={{ color: "#34d399", borderBottom: "1px solid #34d399", paddingBottom: 5, marginTop: 0 }}>2. No Patológicos</h4>
                {NON_PATHOLOGICAL_LIST.map(label => <ConditionRow key={label} label={label} dataGroup={nonPathological} setGroup={setNonPathological} />)}
            </div>
            <div>
                <h4 style={{ color: "#60a5fa", borderBottom: "1px solid #60a5fa", paddingBottom: 5, marginTop: 0 }}>3. Oculares</h4>
                {OCULAR_LIST.map(label => <ConditionRow key={label} label={label} dataGroup={ocular} setGroup={setOcular} />)}
            </div>
            <div>
                <h4 style={{ color: "#fbbf24", borderBottom: "1px solid #fbbf24", paddingBottom: 5, marginTop: 0 }}>4. Heredofamiliares</h4>
                {FAMILY_LIST.map(label => <ConditionRow key={label} label={label} dataGroup={family} setGroup={setFamily} />)}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
             <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#aaa" }}>Alergias</span><input value={extras.allergies} onChange={e => setExtras({...extras, allergies: e.target.value})} style={inputStyle} /></label>
             <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#aaa" }}>Otros Medicamentos</span><input value={extras.medications} onChange={e => setExtras({...extras, medications: e.target.value})} style={inputStyle} /></label>
          </div>
          <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, color: "#aaa" }}>Observaciones Generales</span><textarea rows={2} value={extras.observations} onChange={e => setExtras({...extras, observations: e.target.value})} style={inputStyle} /></label>
          <button type="submit" style={{ background: "#4ade80", color: "black", border: "none", padding: "12px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: "1em" }}>Guardar Anamnesis</button>
        </form>
      )}

      {loading ? <div style={{color:"#666", padding:20, textAlign:"center"}}>Cargando antecedentes...</div> : (
          <div style={{ display: "grid", gap: 10 }}>
            {historyList.map((entry) => (
                <div key={entry.id} style={{ border: "1px solid #333", borderRadius: 8, padding: 15, background: "#111" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, borderBottom: "1px solid #222", paddingBottom: 5 }}>
                    <strong style={{color:"#ddd"}}>{new Date(entry.createdAt).toLocaleDateString()}</strong>
                    <button onClick={() => onDelete(entry.id)} style={{ fontSize: 11, background: "none", border: "none", color: "#666", cursor: "pointer" }}>Eliminar</button>
                  </div>
                  <div style={{fontSize:"0.9em", color:"#ccc"}}>
                      {Object.entries(entry.systemic || {}).map(([k,v]) => <div key={k}>• {k} {v.notes ? `(${v.notes})` : ""}</div>)}
                      {Object.entries(entry.ocular || {}).map(([k,v]) => <div key={k}>• {k} {v.notes ? `(${v.notes})` : ""}</div>)}
                  </div>
                </div>
            ))}
          </div>
      )}
    </section>
  );
}