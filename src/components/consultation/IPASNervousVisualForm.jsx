import React, { useState } from "react";
import { IPAS_NV_CONFIG, MUNK_SCALE, INTENSITY_SCALE, ZONES } from "@/utils/ipasNervousVisualConfig";
import Select from "@/components/ui/Select";

export default function IPASNervousVisualForm({ data, onChange }) {
  const [isOpen, setIsOpen] = useState(true);
  const formData = data || {};

  const updateSymptom = (blockId, symptomId, field, value) => {
    const blockData = formData[blockId] || {};
    const symptomData = blockData[symptomId] || { present: false };
    
    const nextSymptom = { ...symptomData, [field]: value };
    if (field === "present" && value === true) {
        if (!nextSymptom.intensity) nextSymptom.intensity = "";
        if (!nextSymptom.zone) nextSymptom.zone = "";
    }

    onChange({
      ...formData,
      [blockId]: { ...blockData, [symptomId]: nextSymptom }
    });
  };

  const handleNegateBlock = (blockId) => {
    const nextData = { ...formData };
    delete nextData[blockId];
    onChange(nextData);
  };

  const renderFields = (blockId, symptom) => {
    const sData = formData[blockId]?.[symptom.id] || {};
    if (!sData.present) return null;

    return (
      <div className="flex flex-wrap gap-2 flex-1 animate-fadeIn items-center mt-2 md:mt-0">
        <select 
            value={sData.zone} 
            onChange={e => updateSymptom(blockId, symptom.id, "zone", e.target.value)} 
            className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-white focus:border-primary outline-none h-8"
        >
            <option value="">-- Zona --</option>
            {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
        </select>

        {symptom.special === "MUNK" ? (
             <select 
                value={sData.munk} 
                onChange={e => updateSymptom(blockId, symptom.id, "munk", e.target.value)} 
                className="bg-surface border border-blue-500/50 rounded-lg px-2 py-1 text-xs text-white focus:border-primary outline-none h-8"
             >
                <option value="">Munk</option>
                {MUNK_SCALE.map(m => <option key={m} value={m}>Munk {m}</option>)}
             </select>
        ) : (
            <select 
                value={sData.intensity} 
                onChange={e => updateSymptom(blockId, symptom.id, "intensity", e.target.value)} 
                className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-white focus:border-primary outline-none h-8"
            >
                <option value="">Intensidad</option>
                {INTENSITY_SCALE.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
        )}

        <input 
            placeholder="Tiempo..." 
            value={sData.duration || ""} 
            onChange={e => updateSymptom(blockId, symptom.id, "duration", e.target.value)} 
            className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-white focus:border-primary outline-none h-8 w-24"
        />
        <input 
            placeholder="Condición / Detalles..." 
            value={sData.condition || ""} 
            onChange={e => updateSymptom(blockId, symptom.id, "condition", e.target.value)} 
            className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-white focus:border-primary outline-none h-8 flex-1 min-w-[150px]"
        />

        {symptom.special === "LEGANAS" && (
            <>
                <input placeholder="Color" value={sData.color || ""} onChange={e => updateSymptom(blockId, symptom.id, "color", e.target.value)} className="bg-surface border border-amber-500/50 rounded-lg px-2 py-1 text-xs text-white h-8 w-20" />
                <input placeholder="Consist." value={sData.consistency || ""} onChange={e => updateSymptom(blockId, symptom.id, "consistency", e.target.value)} className="bg-surface border border-amber-500/50 rounded-lg px-2 py-1 text-xs text-white h-8 w-24" />
            </>
        )}
        {symptom.special === "ESCOTOMAS" && (
            <>
                <input placeholder="Forma" value={sData.shape || ""} onChange={e => updateSymptom(blockId, symptom.id, "shape", e.target.value)} className="bg-surface border border-purple-500/50 rounded-lg px-2 py-1 text-xs text-white h-8 w-20" />
                <input placeholder="Color" value={sData.color || ""} onChange={e => updateSymptom(blockId, symptom.id, "color", e.target.value)} className="bg-surface border border-purple-500/50 rounded-lg px-2 py-1 text-xs text-white h-8 w-20" />
            </>
        )}
      </div>
    );
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-6 bg-surface/50">
        <div 
            onClick={() => setIsOpen(!isOpen)} 
            className="p-4 bg-surfaceHighlight/30 cursor-pointer flex justify-between items-center border-b border-border/50"
        >
            <div className="font-bold text-blue-400 text-lg">🧠 IPAS: Nervioso y Visual</div>
            <span className="text-textMuted">{isOpen ? "▼" : "▶"}</span>
        </div>

        {isOpen && (
            <div className="p-4 space-y-6 animate-fadeIn">
                {Object.values(IPAS_NV_CONFIG).map(block => {
                    const hasPositives = formData[block.id] && Object.values(formData[block.id]).some(s => s.present);
                    
                    return (
                        <div key={block.id} className={`border rounded-xl p-4 transition-all ${hasPositives ? "border-amber-500/30 bg-amber-900/5" : "border-border bg-background"}`}>
                            <div className="flex justify-between items-center mb-4 border-b border-border/30 pb-2">
                                <strong className={`text-sm ${hasPositives ? "text-amber-400" : "text-textMuted"}`}>{block.title}</strong>
                                <button 
                                    type="button" 
                                    onClick={() => handleNegateBlock(block.id)}
                                    className="text-[10px] bg-emerald-900/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded hover:bg-emerald-900/40 transition-colors"
                                >
                                    ✓ Todo Negado
                                </button>
                            </div>
                            <div className="space-y-2">
                                {block.symptoms.map(sym => {
                                    const isPresent = formData[block.id]?.[sym.id]?.present || false;
                                    return (
                                        <div key={sym.id} className="flex flex-col md:flex-row md:items-center gap-3 border-b border-border/20 last:border-0 pb-2 last:pb-0">
                                            <label className="flex items-center gap-2 cursor-pointer min-w-[200px]">
                                                <input 
                                                    type="checkbox" 
                                                    className="accent-blue-500 w-4 h-4 rounded"
                                                    checked={isPresent} 
                                                    onChange={e => updateSymptom(block.id, sym.id, "present", e.target.checked)} 
                                                />
                                                <span className={`text-sm ${isPresent ? "text-white" : "text-textMuted"}`}>{sym.label}</span>
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
    </div>
  );
}