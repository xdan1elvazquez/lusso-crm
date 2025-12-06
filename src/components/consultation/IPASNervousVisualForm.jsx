// src/components/consultation/IPASNervousVisualForm.jsx
import React, { useState } from "react";
import { IPAS_NV_CONFIG, MUNK_SCALE, INTENSITY_SCALE, ZONES } from "@/utils/ipasNervousVisualConfig";

const styles = {
  container: { border: "1px solid #444", borderRadius: 8, overflow: "hidden", marginBottom: 15 },
  header: { background: "#1f2937", padding: "10px 15px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" },
  blockContainer: { padding: 15, background: "#111", borderTop: "1px solid #333" },
  subHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderBottom: "1px solid #333", paddingBottom: 5 },
  row: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px dashed #333" },
  checkLabel: { minWidth: 200, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#ddd" },
  input: { background: "#222", border: "1px solid #444", color: "white", padding: "4px 8px", borderRadius: 4, fontSize: "0.85em" },
  select: { background: "#222", border: "1px solid #444", color: "white", padding: "4px 8px", borderRadius: 4, fontSize: "0.85em" },
  detailGroup: { display: "flex", gap: 8, flexWrap: "wrap", flex: 1, animation: "fadeIn 0.3s" }
};

export default function IPASNervousVisualForm({ data, onChange }) {
  const [isOpen, setIsOpen] = useState(true);
  const formData = data || {};

  const updateSymptom = (blockId, symptomId, field, value) => {
    const blockData = formData[blockId] || {};
    const symptomData = blockData[symptomId] || { present: false };
    
    const nextSymptom = { ...symptomData, [field]: value };
    if (field === "present" && value === true) {
        // Inicializar defaults si se marca como presente
        if (!nextSymptom.intensity) nextSymptom.intensity = "";
        if (!nextSymptom.zone) nextSymptom.zone = "";
    }

    onChange({
      ...formData,
      [blockId]: {
        ...blockData,
        [symptomId]: nextSymptom
      }
    });
  };

  const handleNegateBlock = (blockId) => {
    // Elimina todas las entradas de ese bloque (vuelve a estado limpio/negado)
    const nextData = { ...formData };
    delete nextData[blockId];
    onChange(nextData);
  };

  const renderFields = (blockId, symptom) => {
    const sData = formData[blockId]?.[symptom.id] || {};
    if (!sData.present) return null;

    return (
      <div style={styles.detailGroup}>
        {/* CAMPOS BASE */}
        <select value={sData.zone} onChange={e => updateSymptom(blockId, symptom.id, "zone", e.target.value)} style={styles.select}>
            <option value="">-- Zona/Ojo --</option>
            {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
        </select>

        {symptom.special === "MUNK" ? (
             <select value={sData.munk} onChange={e => updateSymptom(blockId, symptom.id, "munk", e.target.value)} style={{...styles.select, borderColor: "#60a5fa"}}>
                <option value="">Escala Munk</option>
                {MUNK_SCALE.map(m => <option key={m} value={m}>Munk {m}</option>)}
             </select>
        ) : (
            <select value={sData.intensity} onChange={e => updateSymptom(blockId, symptom.id, "intensity", e.target.value)} style={styles.select}>
                <option value="">-- Intensidad --</option>
                {INTENSITY_SCALE.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
        )}

        <input placeholder="Desde cuándo..." value={sData.duration || ""} onChange={e => updateSymptom(blockId, symptom.id, "duration", e.target.value)} style={{...styles.input, width: 120}} />
        <input placeholder="Condición / Momento..." value={sData.condition || ""} onChange={e => updateSymptom(blockId, symptom.id, "condition", e.target.value)} style={{...styles.input, flex: 1, minWidth: 150}} />

        {/* CAMPOS ESPECIALES */}
        {symptom.special === "LEGANAS" && (
            <>
                <input placeholder="Color" value={sData.color || ""} onChange={e => updateSymptom(blockId, symptom.id, "color", e.target.value)} style={{...styles.input, width: 80, borderColor: "#fbbf24"}} />
                <input placeholder="Consistencia" value={sData.consistency || ""} onChange={e => updateSymptom(blockId, symptom.id, "consistency", e.target.value)} style={{...styles.input, width: 100, borderColor: "#fbbf24"}} />
            </>
        )}
        {symptom.special === "ESCOTOMAS" && (
            <>
                <input placeholder="Forma" value={sData.shape || ""} onChange={e => updateSymptom(blockId, symptom.id, "shape", e.target.value)} style={{...styles.input, width: 80, borderColor: "#a78bfa"}} />
                <input placeholder="Color" value={sData.color || ""} onChange={e => updateSymptom(blockId, symptom.id, "color", e.target.value)} style={{...styles.input, width: 80, borderColor: "#a78bfa"}} />
            </>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
        <div onClick={() => setIsOpen(!isOpen)} style={styles.header}>
            <div style={{fontWeight: "bold", color: "#60a5fa"}}>🧠 IPAS: Nervioso y Visual</div>
            <span style={{color: "#aaa"}}>{isOpen ? "▼" : "▶"}</span>
        </div>

        {isOpen && (
            <div style={styles.blockContainer}>
                {Object.values(IPAS_NV_CONFIG).map(block => {
                    const hasPositives = formData[block.id] && Object.values(formData[block.id]).some(s => s.present);
                    
                    return (
                        <div key={block.id} style={{ marginBottom: 20 }}>
                            <div style={styles.subHeader}>
                                <strong style={{color: hasPositives ? "#fbbf24" : "#9ca3af", fontSize:"0.95em"}}>{block.title}</strong>
                                <button 
                                    type="button" 
                                    onClick={() => handleNegateBlock(block.id)}
                                    style={{fontSize: "0.75em", background: "#064e3b", color: "#4ade80", border: "1px solid #4ade80", borderRadius: 4, padding: "2px 8px", cursor: "pointer"}}
                                >
                                    ✓ Todo Negado
                                </button>
                            </div>
                            <div>
                                {block.symptoms.map(sym => {
                                    const isPresent = formData[block.id]?.[sym.id]?.present || false;
                                    return (
                                        <div key={sym.id} style={styles.row}>
                                            <label style={{...styles.checkLabel, color: isPresent ? "white" : "#888"}}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isPresent} 
                                                    onChange={e => updateSymptom(block.id, sym.id, "present", e.target.checked)} 
                                                />
                                                {sym.label}
                                            </label>
                                            {renderFields(block.id, sym)}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
        <style>{`@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }`}</style>
    </div>
  );
}