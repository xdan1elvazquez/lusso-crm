import React, { useState } from "react";
// 🟢 Lógica original intacta
import { searchDiagnosis } from "@/utils/cie11Catalog";

// 👇 UI Kit
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

export default function DiagnosisManager({ diagnoses, onChange }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);

    const handleSearch = (e) => {
        const val = e.target.value;
        setQuery(val);
        if (val.length > 1) {
            setResults(searchDiagnosis(val));
        } else {
            setResults([]);
        }
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
        <div className="space-y-4">
            <div className="relative z-10">
                <Input 
                    placeholder="🔍 Buscar CIE-11 (ej. Miopía, 9D00...)" 
                    value={query} 
                    onChange={handleSearch} 
                    className="bg-surface"
                />
                
                {results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar animate-fadeIn">
                        {results.map(r => (
                            <div 
                                key={r.code} 
                                onClick={() => addDiagnosis(r)} 
                                className="p-3 border-b border-border last:border-0 hover:bg-surfaceHighlight cursor-pointer transition-colors"
                            >
                                <div className="text-sm text-textMain">
                                    <strong className="text-blue-400 font-mono mr-2">{r.code}</strong> 
                                    {r.name}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                {diagnoses.map((dx, i) => (
                    <div 
                        key={dx.code} 
                        className={`flex justify-between items-center p-3 rounded-lg border transition-colors ${dx.type==="PRINCIPAL" ? "bg-emerald-900/10 border-emerald-500/30" : "bg-surface border-border"}`}
                    >
                        <div className="flex gap-3 items-center">
                            <span className="font-mono font-bold text-white bg-black/20 px-2 py-1 rounded text-xs">{dx.code}</span>
                            <div>
                                <div className="text-sm text-textMain">{dx.name}</div>
                                {dx.type === "PRINCIPAL" && <Badge color="green" className="mt-1 text-[10px] py-0">PRINCIPAL</Badge>}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {dx.type !== "PRINCIPAL" && (
                                <button 
                                    onClick={() => setPrincipal(i)} 
                                    className="text-xs text-textMuted hover:text-white underline decoration-dotted"
                                >
                                    Hacer Principal
                                </button>
                            )}
                            <button onClick={() => removeDiagnosis(i)} className="text-textMuted hover:text-red-400 p-1">✕</button>
                        </div>
                    </div>
                ))}
                
                {diagnoses.length === 0 && (
                    <div className="text-center py-4 text-textMuted text-xs italic bg-surfaceHighlight/10 rounded-lg border border-dashed border-border">
                        Sin diagnósticos seleccionados.
                    </div>
                )}
            </div>
        </div>
    );
}