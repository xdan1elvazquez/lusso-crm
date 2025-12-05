import React, { useState } from "react";
import { searchDiagnosis } from "@/utils/cie10Catalog";

export default function DiagnosisManager({ diagnoses, onChange }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);

    const handleSearch = (e) => {
        const val = e.target.value;
        setQuery(val);
        if (val.length > 1) setResults(searchDiagnosis(val));
        else setResults([]);
    };

    const addDiagnosis = (item) => {
        const exists = diagnoses.find(d => d.code === item.code);
        if (exists) return setQuery("");
        
        const type = diagnoses.length === 0 ? "PRINCIPAL" : "SECONDARY";
        const newDx = { code: item.code, name: item.name, type, notes: "" };
        onChange([...diagnoses, newDx]);
        setQuery("");
        setResults([]);
    };

    const removeDiagnosis = (idx) => {
        const next = diagnoses.filter((_, i) => i !== idx);
        if (next.length > 0 && !next.find(d => d.type === "PRINCIPAL")) {
            next[0].type = "PRINCIPAL";
        }
        onChange(next);
    };

    const setPrincipal = (idx) => {
        const next = diagnoses.map((d, i) => ({
            ...d,
            type: i === idx ? "PRINCIPAL" : "SECONDARY"
        }));
        onChange(next);
    };

    return (
        <div style={{ display: "grid", gap: 10 }}>
            <div style={{ position: "relative" }}>
                <input placeholder="🔍 Buscar CIE-10 (ej. Glaucoma, H40...)" value={query} onChange={handleSearch} style={{ width: "100%", padding: 10, background: "#222", border: "1px solid #444", color: "white", borderRadius: 6 }} />
                {results.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#333", border: "1px solid #555", zIndex: 50, maxHeight: 200, overflowY: "auto", borderRadius: 6 }}>
                        {results.map(r => (
                            <div key={r.code} onClick={() => addDiagnosis(r)} style={{ padding: "8px 12px", borderBottom: "1px solid #444", cursor: "pointer", fontSize: "0.9em" }}>
                                <strong style={{ color: "#60a5fa" }}>{r.code}</strong> {r.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
                {diagnoses.map((dx, i) => (
                    <div key={dx.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: dx.type==="PRINCIPAL"?"rgba(16, 185, 129, 0.1)":"#222", border: dx.type==="PRINCIPAL"?"1px solid #10b981":"1px solid #444", borderRadius: 6, padding: 10 }}>
                        <div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span style={{ fontWeight: "bold", color: "#fff" }}>{dx.code}</span>
                                <span style={{ fontSize: "0.9em", color: "#ddd" }}>{dx.name}</span>
                                {dx.type === "PRINCIPAL" && <span style={{ fontSize: 9, background: "#10b981", color: "black", padding: "2px 4px", borderRadius: 4, fontWeight: "bold" }}>PRINCIPAL</span>}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            {dx.type !== "PRINCIPAL" && <button onClick={() => setPrincipal(i)} style={{ fontSize: 10, background: "transparent", border: "1px solid #aaa", color: "#aaa", cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}>Hacer Principal</button>}
                            <button onClick={() => removeDiagnosis(i)} style={{ color: "#f87171", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                        </div>
                    </div>
                ))}
                {diagnoses.length === 0 && <div style={{ fontSize: 13, color: "#666", fontStyle: "italic", textAlign: "center", padding: 10 }}>Sin diagnósticos CIE-10 seleccionados.</div>}
            </div>
        </div>
    );
}