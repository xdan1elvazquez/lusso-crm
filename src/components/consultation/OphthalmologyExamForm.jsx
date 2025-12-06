// src/components/consultation/OphthalmologyExamForm.jsx
import React, { useState } from "react";
import { OPHTHALMO_CONFIG, getOphthalmoDefaults } from "@/utils/ophthalmologyConfig";

const styles = {
  container: { border: "1px solid #444", borderRadius: 8, overflow: "hidden", marginBottom: 15 },
  header: { background: "#1f2937", padding: "10px 15px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" },
  blockContainer: { padding: 15, background: "#111", borderTop: "1px solid #333" },
  sectionBlock: { marginBottom: 15, border: "1px solid #333", borderRadius: 6, overflow: "hidden" },
  sectionHeader: { padding: "8px 12px", background: "#222", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" },
  sectionContent: { padding: 12, background: "#161616", borderTop: "1px solid #333" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  eyeColumn: { display: "flex", flexDirection: "column", gap: 10 },
  eyeTitle: { fontSize: "0.9em", fontWeight: "bold", textAlign: "center", paddingBottom: 5, borderBottom: "1px solid #333", marginBottom: 5 },
  inputGroup: { marginBottom: 8 },
  label: { display: "block", fontSize: "0.75em", color: "#aaa", marginBottom: 2 },
  input: { width: "100%", padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, fontSize: "0.85em" },
  select: { width: "100%", padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, fontSize: "0.85em" }
};

export default function OphthalmologyExamForm({ data, onChange }) {
  const [isOpen, setIsOpen] = useState(true);
  const [openSections, setOpenSections] = useState({});
  const formData = data || getOphthalmoDefaults();

  const toggleSection = (id) => setOpenSections(p => ({ ...p, [id]: !p[id] }));

  const updateField = (sectionKey, eye, fieldId, value) => {
    const sectionData = formData[sectionKey] || { od: {}, os: {}, isNormal: false };
    const eyeData = sectionData[eye] || {};
    
    onChange({
      ...formData,
      [sectionKey]: {
        ...sectionData,
        isNormal: false, // Al editar, quitamos el flag de "todo normal"
        [eye]: { ...eyeData, [fieldId]: value }
      }
    });
  };

  const setSectionNormal = (sectionKey) => {
    const defaults = getOphthalmoDefaults()[sectionKey];
    onChange({ ...formData, [sectionKey]: defaults });
  };

  const renderInput = (field, eye, sectionKey) => {
    const val = formData[sectionKey]?.[eye]?.[field.id] || "";
    
    if (field.type === "select") {
      return (
        <select 
          value={val} 
          onChange={e => updateField(sectionKey, eye, field.id, e.target.value)} 
          style={styles.select}
        >
          <option value="">-- Seleccionar --</option>
          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    
    return (
      <input 
        type={field.type === "number" ? "number" : "text"}
        value={val} 
        onChange={e => updateField(sectionKey, eye, field.id, e.target.value)} 
        style={styles.input} 
        placeholder={field.placeholder || field.default || ""}
      />
    );
  };

  return (
    <div style={styles.container}>
      <div onClick={() => setIsOpen(!isOpen)} style={styles.header}>
        <div style={{fontWeight: "bold", color: "#60a5fa"}}>3. Exploración Oftalmológica Detallada</div>
        <span style={{color: "#aaa"}}>{isOpen ? "▼" : "▶"}</span>
      </div>

      {isOpen && (
        <div style={styles.blockContainer}>
          {Object.entries(OPHTHALMO_CONFIG).map(([key, config]) => {
            const isNormal = formData[key]?.isNormal;
            return (
              <div key={key} style={{...styles.sectionBlock, borderColor: isNormal ? "#333" : "#fbbf24"}}>
                <div onClick={() => toggleSection(key)} style={styles.sectionHeader}>
                  <div style={{display:"flex", alignItems:"center", gap:10}}>
                    <span style={{fontWeight: "bold", color: isNormal ? "#aaa" : "#fbbf24", fontSize: "0.95em"}}>{config.title}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSectionNormal(key); }}
                      style={{fontSize: "0.7em", background: isNormal ? "#064e3b" : "#333", border: `1px solid ${isNormal ? "#4ade80" : "#555"}`, color: isNormal ? "#4ade80" : "#ccc", borderRadius: 4, padding: "1px 6px", cursor: "pointer"}}
                    >
                      {isNormal ? "✓ Normal" : "Marcar Normal"}
                    </button>
                  </div>
                  <span style={{fontSize: "0.8em"}}>{openSections[key] ? "▲" : "▼"}</span>
                </div>

                {openSections[key] && (
                  <div style={styles.sectionContent}>
                    <div style={styles.grid}>
                      <div style={styles.eyeColumn}>
                        <div style={{...styles.eyeTitle, color: "#60a5fa"}}>OD (Derecho)</div>
                        {config.sections.map(field => (
                          <div key={field.id} style={styles.inputGroup}>
                            <span style={styles.label}>{field.label}</span>
                            {renderInput(field, 'od', key)}
                          </div>
                        ))}
                      </div>
                      
                      <div style={styles.eyeColumn}>
                        <div style={{...styles.eyeTitle, color: "#4ade80"}}>OI (Izquierdo)</div>
                        {config.sections.map(field => (
                          <div key={field.id} style={styles.inputGroup}>
                            <span style={styles.label}>{field.label}</span>
                            {renderInput(field, 'os', key)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}