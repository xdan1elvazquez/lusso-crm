import React, { useState, useEffect } from "react";

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
        <div className={`border rounded-xl overflow-hidden mb-3 transition-colors ${!data.isNormal ? "border-amber-500/50 bg-amber-900/10" : "border-border bg-surface"}`}>
            <div 
                onClick={() => setIsOpen(!isOpen)} 
                className="p-3 cursor-pointer flex justify-between items-center hover:bg-white/5 select-none"
            >
                <div className={`text-sm font-bold ${data.isNormal ? "text-textMuted" : "text-amber-400"}`}>{config.label}</div>
                <div className="flex gap-3 items-center">
                    <span className={`text-[10px] px-2 py-1 rounded font-bold border ${data.isNormal ? "bg-emerald-900/20 text-emerald-400 border-emerald-500/30" : "bg-red-900/20 text-red-400 border-red-500/30"}`}>
                        {data.isNormal ? "NEGADO" : "ANORMAL"}
                    </span>
                    <span className="text-textMuted text-xs">{isOpen ? "▲" : "▼"}</span>
                </div>
            </div>
            
            {isOpen && (
                <div className="p-4 border-t border-border bg-black/20 animate-fadeIn">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {config.options.map(opt => (
                            <button 
                                key={opt} 
                                type="button" 
                                onClick={() => toggleOption(opt)} 
                                className={`
                                    text-xs px-3 py-1.5 rounded-full border transition-all
                                    ${data.selected?.includes(opt) 
                                        ? "bg-amber-500/20 text-amber-400 border-amber-500/50" 
                                        : "bg-surfaceHighlight border-border text-textMuted hover:text-white"
                                    }
                                `}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                    <textarea 
                        rows={2} 
                        placeholder={`Detalles para ${config.label}...`} 
                        value={data.details} 
                        onChange={e => handleDetails(e.target.value)} 
                        className="w-full bg-background border border-border rounded-lg p-2 text-sm text-white focus:border-primary outline-none resize-y" 
                    />
                    {!data.isNormal && (
                        <button 
                            type="button" 
                            onClick={setNormal} 
                            className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 underline"
                        >
                            Marcar como Negado / Normal
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}