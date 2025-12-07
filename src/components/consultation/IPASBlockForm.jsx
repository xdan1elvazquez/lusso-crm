import React, { useState } from "react";
import { INTENSITY_SCALE } from "@/utils/ipasExtendedConfig";
import Input from "@/components/ui/Input";

export default function IPASBlockForm({ config, data, onChange, title }) {
  const [isOpen, setIsOpen] = useState(false);
  const formData = data || {};

  const updateSymptom = (blockId, symptomId, field, value) => {
    const blockData = formData[blockId] || {};
    const symptomData = blockData[symptomId] || { present: false };
    
    const nextSymptom = { ...symptomData, [field]: value };
    if (field === "present" && value === true) {
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
          [blockId]: { ...blockData, [fieldId]: value } 
      });
  };

  const handleNegateBlock = (blockId) => {
    const nextData = { ...formData };
    delete nextData[blockId];
    onChange(nextData);
  };

  const renderHeaderFields = (block) => {
      if (!block.headerFields) return null;
      return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-surfaceHighlight/20 rounded-lg border border-border">
              {block.headerFields.map(field => (
                  <div key={field.id} style={{ gridColumn: field.width > 100 ? "span 2" : "span 1" }}>
                      <Input 
                        label={field.label}
                        type={field.type || "text"}
                        placeholder={field.placeholder || ""}
                        value={formData[block.id]?.[field.id] || ""}
                        onChange={e => updateHeaderField(block.id, field.id, e.target.value)}
                        className="h-8 text-xs"
                      />
                  </div>
              ))}
          </div>
      );
  };

  const renderFields = (blockId, symptom) => {
    const sData = formData[blockId]?.[symptom.id] || {};
    if (!sData.present) return null;

    return (
      <div className="flex flex-wrap gap-2 flex-1 animate-fadeIn items-center mt-2 md:mt-0">
        <input 
            placeholder="Zona / Característica..." 
            value={sData.zone || ""} 
            onChange={e => updateSymptom(blockId, symptom.id, "zone", e.target.value)} 
            className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-white focus:border-primary outline-none h-8 flex-1"
        />
        
        <select 
            value={sData.intensity} 
            onChange={e => updateSymptom(blockId, symptom.id, "intensity", e.target.value)} 
            className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-white focus:border-primary outline-none h-8 w-24"
        >
            <option value="">Intensidad</option>
            {INTENSITY_SCALE.map(i => <option key={i} value={i}>{i}</option>)}
        </select>

        <input 
            placeholder="Desde cuándo..." 
            value={sData.duration || ""} 
            onChange={e => updateSymptom(blockId, symptom.id, "duration", e.target.value)} 
            className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-white focus:border-primary outline-none h-8 w-24" 
        />
        <input 
            placeholder="Condición..." 
            value={sData.condition || ""} 
            onChange={e => updateSymptom(blockId, symptom.id, "condition", e.target.value)} 
            className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-white focus:border-primary outline-none h-8 flex-1" 
        />
      </div>
    );
  };

  const hasPositives = Object.keys(config).some(blockId => {
      const blk = formData[blockId];
      if (!blk) return false;
      const hasSym = config[blockId].symptoms.some(s => blk[s.id]?.present);
      const hasHeader = config[blockId].headerFields?.some(f => blk[f.id]);
      return hasSym || hasHeader;
  });

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-6 bg-surface/50">
        <div 
            onClick={() => setIsOpen(!isOpen)} 
            className="p-4 bg-surfaceHighlight/30 cursor-pointer flex justify-between items-center border-b border-border/50"
        >
            <div className={`font-bold text-lg ${hasPositives ? "text-amber-400" : "text-emerald-400"}`}>
                {title}
            </div>
            <span className="text-textMuted">{isOpen ? "▼" : "▶"}</span>
        </div>

        {isOpen && (
            <div className="p-4 space-y-6 animate-fadeIn">
                {Object.values(config).map(block => {
                    const blkData = formData[block.id] || {};
                    const blockHasPositives = block.symptoms.some(s => blkData[s.id]?.present) || (block.headerFields?.some(f => blkData[f.id]));

                    return (
                        <div key={block.id} className={`border rounded-xl p-4 transition-all ${blockHasPositives ? "border-amber-500/30 bg-amber-900/5" : "border-border bg-background"}`}>
                            <div className="flex justify-between items-center mb-4 border-b border-border/30 pb-2">
                                <strong className={`text-sm ${blockHasPositives ? "text-amber-400" : "text-textMuted"}`}>{block.title}</strong>
                                <button 
                                    type="button" 
                                    onClick={() => handleNegateBlock(block.id)}
                                    className="text-[10px] bg-emerald-900/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded hover:bg-emerald-900/40 transition-colors"
                                >
                                    ✓ Todo Negado
                                </button>
                            </div>
                            
                            {renderHeaderFields(block)}

                            <div className="space-y-2">
                                {block.symptoms.map(sym => {
                                    const isPresent = blkData[sym.id]?.present || false;
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