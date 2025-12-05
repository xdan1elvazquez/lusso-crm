import React, { useState, useEffect } from "react";
import { 
  getDiabetesMeds, updateDiabetesMeds, 
  getHypertensionMeds, updateHypertensionMeds 
} from "@/services/settingsStorage";

const styles = {
  input: { width: "100%", padding: 8, background: "#111", border: "1px solid #444", color: "white", borderRadius: 4, fontSize: "0.9em" },
  label: { fontSize: "0.8em", color: "#aaa", display: "block", marginBottom: 2 },
  btnSmall: { fontSize: "0.75em", background: "#333", border: "1px solid #555", color: "#ccc", padding: "2px 6px", borderRadius: 4, cursor: "pointer", marginLeft: 8 }
};

export default function SpecialDiseaseForm({ type, data, onChange }) {
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Cargar catálogo según tipo
  useEffect(() => {
    async function load() {
      try {
        let list = [];
        if (type === "DIABETES") list = await getDiabetesMeds();
        if (type === "HAS") list = await getHypertensionMeds();
        setCatalog(list || []);
      } catch (e) {
        console.error("Error cargando catálogo meds", e);
      } finally {
        setLoadingCatalog(false);
      }
    }
    load();
  }, [type]);

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

  // Función para guardar nuevo medicamento en catálogo global
  const saveToCatalog = async (medName) => {
    if (!medName || catalog.includes(medName)) return;
    if (!confirm(`¿Agregar "${medName}" al catálogo global de ${type}?`)) return;
    
    const newList = [...catalog, medName].sort();
    setCatalog(newList);
    
    if (type === "DIABETES") await updateDiabetesMeds(newList);
    if (type === "HAS") await updateHypertensionMeds(newList);
  };

  const labelColor = type === "DIABETES" ? "#f87171" : "#60a5fa";
  const listId = `meds-list-${type}`;

  return (
    <div style={{ marginTop: 10, padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 6, borderLeft: `3px solid ${labelColor}` }}>
      <div style={{fontSize:"0.9em", color: labelColor, fontWeight:"bold", marginBottom:10}}>
        {type === "DIABETES" ? "🩸 Control Glucémico" : "❤️ Control Hipertensivo"}
      </div>
      
      {/* CAMPOS CLÍNICOS */}
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

      {/* SECCIÓN MEDICAMENTOS CON CATÁLOGO */}
      <div style={{background:"#000", padding:10, borderRadius:6}}>
        <div style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
          <span style={{fontSize:"0.8em", color:"#aaa"}}>Medicamentos ({safeData.meds.length})</span>
          <button type="button" onClick={addMed} style={{fontSize:"0.75em", background:"#333", border:"none", color:"#4ade80", cursor:"pointer", padding:"2px 6px", borderRadius:4}}>+ Agregar Med</button>
        </div>
        
        {/* Datalist invisible para autocompletar */}
        <datalist id={listId}>
            {catalog.map(opt => <option key={opt} value={opt} />)}
        </datalist>

        {safeData.meds.length === 0 && <div style={{fontSize:"0.8em", color:"#555", fontStyle:"italic"}}>Sin medicamentos registrados.</div>}
        
        {safeData.meds.map((med, i) => {
            const isKnown = catalog.includes(med.name);
            return (
              <div key={med.id} style={{marginBottom: 8, borderBottom:"1px solid #222", paddingBottom:5}}>
                <div style={{display:"flex", gap: 5, marginBottom: 5}}>
                    <div style={{flex: 1, position:"relative"}}>
                        <input 
                            list={listId}
                            placeholder="Buscar medicamento..." 
                            value={med.name} 
                            onChange={e => updateMed(i, "name", e.target.value)} 
                            style={{...styles.input, padding:4, fontSize:"0.85em", borderColor: med.name && !isKnown ? "#fbbf24" : "#444"}} 
                        />
                        {/* Botón flotante para guardar si es nuevo */}
                        {med.name && !isKnown && !loadingCatalog && (
                            <span 
                                onClick={() => saveToCatalog(med.name)}
                                title="Guardar en catálogo"
                                style={{position:"absolute", right: 5, top: 5, cursor:"pointer", fontSize:"0.8em", color:"#fbbf24"}}
                            >
                                💾
                            </span>
                        )}
                    </div>
                    <button type="button" onClick={() => removeMed(i)} style={{color:"#f87171", background:"none", border:"none", cursor:"pointer", padding:"0 5px"}}>✕</button>
                </div>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:5}}>
                    <input placeholder="Dosis (Ej. 1-0-1)" value={med.dose} onChange={e => updateMed(i, "dose", e.target.value)} style={{...styles.input, padding:4, fontSize:"0.8em"}} />
                    <input placeholder="Última toma" value={med.lastTake} onChange={e => updateMed(i, "lastTake", e.target.value)} style={{...styles.input, padding:4, fontSize:"0.8em"}} />
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
}