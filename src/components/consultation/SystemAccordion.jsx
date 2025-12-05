import React, { useState, useEffect } from "react";

const textareaStyle = { width: "100%", padding: 8, background: "#222", border: "1px solid #444", color: "white", borderRadius: 4, resize: "vertical", fontSize: "0.9em" };

export default function SystemAccordion({ config, data, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    
    useEffect(() => {
        if (config.id === "endocrine" || config.id === "cardiovascular" || !data.isNormal) {
            setIsOpen(true);
        }
    }, []);

    const toggleOption = (opt) => {
        const currentSelected = data.selected || [];
        const newSelected = currentSelected.includes(opt) 
            ? currentSelected.filter(s => s !== opt)
            : [...currentSelected, opt];
        
        onChange({ ...data, isNormal: false, selected: newSelected });
    };

    const handleDetails = (text) => { onChange({ ...data, isNormal: false, details: text }); };
    const setNormal = (e) => { e.stopPropagation(); onChange({ isNormal: true, selected: [], details: "" }); };

    return (
        <div style={{ marginBottom: 8, border: "1px solid #444", borderRadius: 6, overflow: "hidden" }}>
            <div onClick={() => setIsOpen(!isOpen)} style={{ padding: "8px 12px", background: "#222", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: "bold", color: data.isNormal ? "#aaa" : "#fbbf24", fontSize: "0.95em" }}>{config.label}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: data.isNormal ? "#064e3b" : "#450a0a", color: data.isNormal ? "#4ade80" : "#f87171", fontWeight: "bold" }}>{data.isNormal ? "NEGADO" : "ANORMAL"}</span>
                    <span style={{ fontSize: 10, color: "#666" }}>{isOpen ? "▲" : "▼"}</span>
                </div>
            </div>
            {isOpen && (
                <div style={{ padding: 12, background: "#1a1a1a", borderTop: "1px solid #333" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        {config.options.map(opt => (
                            <button key={opt} type="button" onClick={() => toggleOption(opt)} style={{fontSize: 11, padding: "4px 8px", borderRadius: 12, border: "1px solid", cursor: "pointer", background: data.selected?.includes(opt) ? "rgba(251, 191, 36, 0.1)" : "transparent", borderColor: data.selected?.includes(opt) ? "#fbbf24" : "#444", color: data.selected?.includes(opt) ? "#fbbf24" : "#888"}}>{opt}</button>
                        ))}
                    </div>
                    <textarea rows={2} placeholder={`Detalles para ${config.label}...`} value={data.details} onChange={e => handleDetails(e.target.value)} style={textareaStyle} />
                    {!data.isNormal && <button type="button" onClick={setNormal} style={{ marginTop: 8, fontSize: 11, color: "#4ade80", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Marcar como Negado / Normal</button>}
                </div>
            )}
        </div>
    );
}