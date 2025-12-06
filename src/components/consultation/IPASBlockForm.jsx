// src/components/consultation/IPASBlockForm.jsx
import React, { useState } from "react";
import { INTENSITY_SCALE } from "@/utils/ipasExtendedConfig";

const styles = {
  container: { border: "1px solid #444", borderRadius: 8, overflow: "hidden", marginBottom: 15 },
  header: { background: "#1f2937", padding: "10px 15px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" },
  blockContainer: { padding: 15, background: "#111", borderTop: "1px solid #333" },
  subHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderBottom: "1px solid #333", paddingBottom: 5 },
  row: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px dashed #333" },
  checkLabel: { minWidth: 200, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#ddd" },
  input: { background: "#222", border: "1px solid #444", color: "white", padding: "4px 8px", borderRadius: 4, fontSize: "0.85em" },
  select: { background: "#222", border: "1px solid #444", color: "white", padding: "4px 8px", borderRadius: 4, fontSize: "0.85em" },
  detailGroup: { display: "flex", gap: 8, flexWrap: "wrap", flex: 1, animation: "fadeIn 0.3s" },
  headerFieldsContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 15, padding: 10, background: "#1a1a1a", borderRadius: 6 }
};

export default function IPASBlockForm({ config, data, onChange, title }) {
  const [isOpen, setIsOpen] = useState(false);
  const formData = data || {};

  const updateSymptom = (blockId, symptomId, field, value) => {
    const blockData = formData[blockId] || {};
    const symptomData = blockData[symptomId] || { present: false };
    
    const nextSymptom = { ...symptomData, [field]: value };
    if (field === "present" && value === true) {
        // Defaults
        if (!nextSymptom.intensity) nextSymptom.intensity = "";
    }

    onChange({
      ...formData,
      [blockId]: { ...blockData, [symptomId]: nextSymptom }
    });
  };

  const updateHeaderField = (blockId, fieldId, value) => {
      const blockData = formData[blockId] || {};
      onChange({
          ...formData,
          [blockId]: { ...blockData, [fieldId]: value } // Guardamos directo en la raíz del bloque
      });
  };

  const handleNegateBlock = (blockId) => {
    // Borramos datos del bloque para reiniciar a "negado"
    const nextData = { ...formData };
    delete nextData[blockId];
    onChange(nextData);
  };

  const renderHeaderFields = (block) => {
      if (!block.headerFields) return null;
      return (
          <div style={styles.headerFieldsContainer}>
              {block.headerFields.map(field => (
                  <label key={field.id} style={{display:"block"}}>
                      <span style={{fontSize:"0.75em", color:"#aaa", display:"block", marginBottom:2}}>{field.label}</span>
                      <input 
                        type={field.type || "text"}
                        placeholder={field.placeholder || ""}
                        value={formData[block.id]?.[field.id] || ""}
                        onChange={e => updateHeaderField(block.id, field.id, e.target.value)}
                        style={{...styles.input, width: "100%", boxSizing: "border-box"}} 
                      />
                  </label>
              ))}
          </div>
      );
  };

  const renderFields = (blockId, symptom) => {
    const sData = formData[blockId]?.[symptom.id] || {};
    if (!sData.present) return null;

    return (
      <div style={styles.detailGroup}>
        <input placeholder="Característica / Zona..." value={sData.zone || ""} onChange={e => updateSymptom(blockId, symptom.id, "zone", e.target.value)} style={{...styles.input, flex: 1}} />
        
        <select value={sData.intensity} onChange={e => updateSymptom(blockId, symptom.id, "intensity", e.target.value)} style={{...styles.select, width: 100}}>
            <option value="">Intensidad</option>
            {INTENSITY_SCALE.map(i => <option key={i} value={i}>{i}</option>)}
        </select>

        <input placeholder="Desde cuándo..." value={sData.duration || ""} onChange={e => updateSymptom(blockId, symptom.id, "duration", e.target.value)} style={{...styles.input, width: 100}} />
        <input placeholder="Condición / En qué..." value={sData.condition || ""} onChange={e => updateSymptom(blockId, symptom.id, "condition", e.target.value)} style={{...styles.input, flex: 1}} />
      </div>
    );
  };

  // Calculamos si hay algo positivo para pintar el título
  const hasPositives = Object.keys(config).some(blockId => {
      const blk = formData[blockId];
      if (!blk) return false;
      // Check symptoms
      const hasSym = config[blockId].symptoms.some(s => blk[s.id]?.present);
      // Check header fields (si existen y tienen valor)
      const hasHeader = config[blockId].headerFields?.some(f => blk[f.id]);
      return hasSym || hasHeader;
  });

  return (
    <div style={styles.container}>
        <div onClick={() => setIsOpen(!isOpen)} style={styles.header}>
            <div style={{fontWeight: "bold", color: hasPositives ? "#fbbf24" : "#4ade80"}}>
                {title}
            </div>
            <span style={{color: "#aaa"}}>{isOpen ? "▼" : "▶"}</span>
        </div>

        {isOpen && (
            <div style={styles.blockContainer}>
                {Object.values(config).map(block => {
                    // Estado local del bloque para UI
                    const blkData = formData[block.id] || {};
                    const blockHasPositives = block.symptoms.some(s => blkData[s.id]?.present) || (block.headerFields?.some(f => blkData[f.id]));

                    return (
                        <div key={block.id} style={{ marginBottom: 25 }}>
                            <div style={styles.subHeader}>
                                <strong style={{color: blockHasPositives ? "#fbbf24" : "#9ca3af", fontSize:"0.95em"}}>{block.title}</strong>
                                <button 
                                    type="button" 
                                    onClick={() => handleNegateBlock(block.id)}
                                    style={{fontSize: "0.75em", background: "#064e3b", color: "#4ade80", border: "1px solid #4ade80", borderRadius: 4, padding: "2px 8px", cursor: "pointer"}}
                                >
                                    ✓ Todo Negado
                                </button>
                            </div>
                            
                            {/* Header Fields (Gineco etc) */}
                            {renderHeaderFields(block)}

                            {/* Symptoms List */}
                            <div>
                                {block.symptoms.map(sym => {
                                    const isPresent = blkData[sym.id]?.present || false;
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