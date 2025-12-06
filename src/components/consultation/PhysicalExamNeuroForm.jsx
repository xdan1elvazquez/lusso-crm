// src/components/consultation/PhysicalExamNeuroForm.jsx
import React, { useState } from "react";
import { PE_NEURO_CONFIG, getNeuroDefaults } from "@/utils/physicalExamNeuroConfig";

const styles = {
  container: { border: "1px solid #444", borderRadius: 8, overflow: "hidden", marginBottom: 15 },
  header: { background: "#1f2937", padding: "10px 15px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" },
  blockContainer: { padding: 15, background: "#111", borderTop: "1px solid #333" },
  sectionBlock: { marginBottom: 15, border: "1px solid #333", borderRadius: 6, overflow: "hidden" },
  sectionHeader: { padding: "8px 12px", background: "#222", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" },
  sectionContent: { padding: 12, background: "#161616", borderTop: "1px solid #333", display:"grid", gap:10 },
  input: { width: "100%", padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, fontSize: "0.9em" },
  select: { padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, fontSize: "0.9em" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingBottom: 8, borderBottom: "1px dashed #333" },
  toggleGroup: { display: "flex", alignItems: "center", gap: 8 },
  note: { fontSize: "0.8em", color: "#60a5fa", fontStyle: "italic", padding: "4px 8px", background: "rgba(96, 165, 250, 0.1)", borderRadius: 4 }
};

export default function PhysicalExamNeuroForm({ data, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const formData = data || getNeuroDefaults();

  const toggleSection = (id) => setOpenSections(p => ({ ...p, [id]: !p[id] }));

  const updateItem = (sectionId, itemId, value) => {
    const sectionData = formData[sectionId] || {};
    onChange({ ...formData, [sectionId]: { ...sectionData, [itemId]: value } });
  };

  const setSectionNormal = (sectionId) => {
      const defaults = {};
      PE_NEURO_CONFIG[sectionId].items.forEach(i => {
          if (i.type !== 'note') defaults[i.id] = i.default !== undefined ? i.default : "";
      });
      defaults.notas = "";
      onChange({ ...formData, [sectionId]: defaults });
  };

  // Detectar si hay algo anormal para pintar el título de amarillo
  const hasAbnormalities = (sectionId) => {
      const sectionData = formData[sectionId] || {};
      const config = PE_NEURO_CONFIG[sectionId];
      return config.items.some(item => {
          if (item.type === "note") return false;
          const val = sectionData[item.id];
          if (item.type === "toggle") return item.invert ? !val : val; // Invert: true es normal
          if (item.default !== undefined && val !== item.default) return true;
          return false;
      });
  };

  return (
    <div style={styles.container}>
        <div onClick={() => setIsOpen(!isOpen)} style={styles.header}>
            <div style={{fontWeight: "bold", color: "#e5e7eb"}}>3. Exploración Neurológica y Otros</div>
            <span style={{color: "#aaa"}}>{isOpen ? "▼" : "▶"}</span>
        </div>

        {isOpen && (
            <div style={styles.blockContainer}>
                {Object.entries(PE_NEURO_CONFIG).map(([key, config]) => {
                    const isAbnormal = hasAbnormalities(key);
                    return (
                        <div key={key} style={{...styles.sectionBlock, borderColor: isAbnormal ? "#f59e0b" : "#333"}}>
                            <div onClick={() => toggleSection(key)} style={styles.sectionHeader}>
                                <span style={{fontWeight: "bold", color: isAbnormal ? "#fbbf24" : "#aaa", fontSize: "0.95em"}}>{config.title}</span>
                                <div style={{display:"flex", gap:10, alignItems:"center"}}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSectionNormal(key); }}
                                        style={{fontSize: "0.7em", background: "#333", border: "1px solid #555", color: "#ccc", borderRadius: 4, padding: "2px 6px", cursor: "pointer"}}
                                    >
                                        Normal
                                    </button>
                                    <span style={{fontSize: "0.8em"}}>{openSections[key] ? "▲" : "▼"}</span>
                                </div>
                            </div>
                            
                            {openSections[key] && (
                                <div style={styles.sectionContent}>
                                    {config.items.map(item => (
                                        <div key={item.id} style={styles.row}>
                                            <span style={{fontSize:"0.9em", color:"#ddd", flex:1}}>{item.label}</span>
                                            
                                            {/* RENDERIZADO SEGÚN TIPO */}
                                            <div style={{flex: 1.5}}>
                                                {item.type === "note" ? (
                                                    <span style={styles.note}>{item.text}</span>
                                                ) : item.type === "toggle" ? (
                                                    <div style={styles.toggleGroup}>
                                                        <label style={{display:"flex", alignItems:"center", gap:5, cursor:"pointer"}}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={formData[key]?.[item.id] ?? item.default} 
                                                                onChange={e => updateItem(key, item.id, e.target.checked)} 
                                                            />
                                                            <span style={{fontSize:"0.8em", color: (formData[key]?.[item.id] ?? item.default) === (item.invert) ? "#4ade80" : "#f87171"}}>
                                                                {(formData[key]?.[item.id] ?? item.default) ? (item.invert ? "Normal" : "Positivo") : (item.invert ? "Anormal" : "Negativo")}
                                                            </span>
                                                        </label>
                                                    </div>
                                                ) : item.type === "select" ? (
                                                    <select 
                                                        value={formData[key]?.[item.id] || item.default} 
                                                        onChange={e => updateItem(key, item.id, e.target.value)} 
                                                        style={styles.select}
                                                    >
                                                        {item.options.map(o => <option key={o} value={o}>{o}</option>)}
                                                    </select>
                                                ) : item.type === "textarea" ? (
                                                    <textarea 
                                                        rows={2}
                                                        value={formData[key]?.[item.id] || ""} 
                                                        onChange={e => updateItem(key, item.id, e.target.value)} 
                                                        style={{...styles.input, resize:"vertical"}} 
                                                    />
                                                ) : (
                                                    <input 
                                                        value={formData[key]?.[item.id] || ""} 
                                                        onChange={e => updateItem(key, item.id, e.target.value)} 
                                                        style={styles.input} 
                                                        placeholder={item.placeholder || ""}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* CAMPO LIBRE POR SECCIÓN PARA DETALLES */}
                                    <textarea 
                                        rows={2} 
                                        placeholder={`Detalles adicionales de ${config.title}...`} 
                                        value={formData[key]?.notas || ""} 
                                        onChange={e => updateItem(key, "notas", e.target.value)}
                                        style={{...styles.input, resize:"vertical", marginTop:5, borderColor:"#444"}} 
                                    />
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