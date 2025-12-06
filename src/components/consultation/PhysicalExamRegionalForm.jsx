// src/components/consultation/PhysicalExamRegionalForm.jsx
import React, { useState } from "react";
import { PE_REGIONS_CONFIG, getRegionalExamDefaults } from "@/utils/physicalExamRegionsConfig";

const styles = {
  container: { border: "1px solid #444", borderRadius: 8, overflow: "hidden", marginBottom: 15 },
  header: { background: "#1f2937", padding: "10px 15px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" },
  blockContainer: { padding: 15, background: "#111", borderTop: "1px solid #333" },
  regionBlock: { marginBottom: 15, border: "1px solid #333", borderRadius: 6, overflow: "hidden" },
  regionHeader: { padding: "8px 12px", background: "#222", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" },
  regionContent: { padding: 12, background: "#161616", borderTop: "1px solid #333", display:"grid", gap:10 },
  input: { width: "100%", padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, fontSize: "0.9em" },
  select: { padding: 6, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, fontSize: "0.9em" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingBottom: 8, borderBottom: "1px dashed #333" },
  toggleGroup: { display: "flex", alignItems: "center", gap: 8 }
};

export default function PhysicalExamRegionalForm({ data, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openRegions, setOpenRegions] = useState({});
  const formData = data || getRegionalExamDefaults();

  const toggleRegion = (id) => setOpenRegions(p => ({ ...p, [id]: !p[id] }));

  const updateItem = (regionId, itemId, value) => {
    const regionData = formData[regionId] || {};
    onChange({ ...formData, [regionId]: { ...regionData, [itemId]: value } });
  };

  const setRegionNormal = (regionId) => {
      const defaults = {};
      PE_REGIONS_CONFIG[regionId].items.forEach(i => defaults[i.id] = i.default !== undefined ? i.default : "");
      defaults.notas = "";
      onChange({ ...formData, [regionId]: defaults });
  };

  const hasAbnormalities = (regionId) => {
      const regionData = formData[regionId] || {};
      const config = PE_REGIONS_CONFIG[regionId];
      return config.items.some(item => {
          const val = regionData[item.id];
          if (item.type === "toggle") return item.invert ? !val : val;
          if (item.default !== undefined && val !== item.default) return true;
          return false;
      });
  };

  return (
    <div style={styles.container}>
        <div onClick={() => setIsOpen(!isOpen)} style={styles.header}>
            <div style={{fontWeight: "bold", color: "#e5e7eb"}}>2. Exploración por Regiones (Céfalo-Caudal)</div>
            <span style={{color: "#aaa"}}>{isOpen ? "▼" : "▶"}</span>
        </div>

        {isOpen && (
            <div style={styles.blockContainer}>
                {Object.values(PE_REGIONS_CONFIG).map(region => {
                    const isAbnormal = hasAbnormalities(region.id);
                    return (
                        <div key={region.id} style={{...styles.regionBlock, borderColor: isAbnormal ? "#f59e0b" : "#333"}}>
                            <div onClick={() => toggleRegion(region.id)} style={styles.regionHeader}>
                                <span style={{fontWeight: "bold", color: isAbnormal ? "#fbbf24" : "#aaa"}}>{region.title}</span>
                                <div style={{display:"flex", gap:10, alignItems:"center"}}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setRegionNormal(region.id); }}
                                        style={{fontSize: "0.7em", background: "#333", border: "1px solid #555", color: "#ccc", borderRadius: 4, padding: "2px 6px", cursor: "pointer"}}
                                    >
                                        Normal
                                    </button>
                                    <span style={{fontSize: "0.8em"}}>{openRegions[region.id] ? "▲" : "▼"}</span>
                                </div>
                            </div>
                            
                            {openRegions[region.id] && (
                                <div style={styles.regionContent}>
                                    {region.items.map(item => (
                                        <div key={item.id} style={styles.row}>
                                            <span style={{fontSize:"0.9em", color:"#ddd", flex:1}}>{item.label}</span>
                                            <div style={{flex: 1.5}}>
                                                {item.type === "toggle" ? (
                                                    <div style={styles.toggleGroup}>
                                                        <label style={{display:"flex", alignItems:"center", gap:5, cursor:"pointer"}}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={formData[region.id]?.[item.id] ?? item.default} 
                                                                onChange={e => updateItem(region.id, item.id, e.target.checked)} 
                                                            />
                                                            <span style={{fontSize:"0.8em", color: (formData[region.id]?.[item.id] ?? item.default) === (item.invert) ? "#4ade80" : "#f87171"}}>
                                                                {(formData[region.id]?.[item.id] ?? item.default) ? (item.invert ? "Normal" : "Presente") : (item.invert ? "Anormal" : "Ausente")}
                                                            </span>
                                                        </label>
                                                    </div>
                                                ) : item.type === "select" ? (
                                                    <select 
                                                        value={formData[region.id]?.[item.id] || item.default} 
                                                        onChange={e => updateItem(region.id, item.id, e.target.value)} 
                                                        style={styles.select}
                                                    >
                                                        {item.options.map(o => <option key={o} value={o}>{o}</option>)}
                                                    </select>
                                                ) : (
                                                    <input 
                                                        value={formData[region.id]?.[item.id] || ""} 
                                                        onChange={e => updateItem(region.id, item.id, e.target.value)} 
                                                        style={styles.input} 
                                                        placeholder={item.default ? `(Default: ${item.default})` : ""}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <textarea 
                                        rows={2} 
                                        placeholder="Notas adicionales de esta región..." 
                                        value={formData[region.id]?.notas || ""} 
                                        onChange={e => updateItem(region.id, "notas", e.target.value)}
                                        style={{...styles.input, resize:"vertical", marginTop:5}} 
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