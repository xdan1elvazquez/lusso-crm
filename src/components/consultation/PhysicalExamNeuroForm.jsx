import React, { useState } from "react";
import { PE_NEURO_CONFIG, getNeuroDefaults } from "@/utils/physicalExamNeuroConfig";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

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

  const hasAbnormalities = (sectionId) => {
      const sectionData = formData[sectionId] || {};
      const config = PE_NEURO_CONFIG[sectionId];
      return config.items.some(item => {
          if (item.type === "note") return false;
          const val = sectionData[item.id];
          if (item.type === "toggle") return item.invert ? !val : val; 
          if (item.default !== undefined && val !== item.default) return true;
          return false;
      });
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-6 bg-surface/50">
        <div 
            onClick={() => setIsOpen(!isOpen)} 
            className="p-4 bg-surfaceHighlight/30 cursor-pointer flex justify-between items-center border-b border-border/50"
        >
            <div className="font-bold text-white text-lg">3. Exploración Neurológica y Otros</div>
            <span className="text-textMuted">{isOpen ? "▼" : "▶"}</span>
        </div>

        {isOpen && (
            <div className="p-4 grid gap-3 animate-fadeIn">
                {Object.entries(PE_NEURO_CONFIG).map(([key, config]) => {
                    const isAbnormal = hasAbnormalities(key);
                    const isOpenSection = openSections[key];
                    return (
                        <div key={key} className={`border rounded-xl overflow-hidden transition-all duration-200 ${isAbnormal ? "border-amber-500/50 bg-amber-900/10" : "border-border bg-background"}`}>
                            <div 
                                onClick={() => toggleSection(key)} 
                                className="p-3 flex justify-between items-center cursor-pointer hover:bg-white/5"
                            >
                                <span className={`font-bold text-sm ${isAbnormal ? "text-amber-400" : "text-textMuted"}`}>{config.title}</span>
                                <div className="flex gap-3 items-center">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSectionNormal(key); }}
                                        className="text-[10px] bg-surface border border-border px-2 py-1 rounded text-textMuted hover:text-white hover:border-primary transition-colors"
                                    >
                                        Normal
                                    </button>
                                    <span className="text-xs text-textMuted">{isOpenSection ? "▲" : "▼"}</span>
                                </div>
                            </div>
                            
                            {isOpenSection && (
                                <div className="p-4 border-t border-border bg-black/20 grid gap-3">
                                    {config.items.map(item => (
                                        <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-border/30 pb-2 last:border-0 last:pb-0">
                                            <span className="text-sm text-gray-300 md:w-1/3">{item.label}</span>
                                            <div className="flex-1">
                                                {item.type === "note" ? (
                                                    <span className="text-xs text-blue-400 italic bg-blue-900/20 px-2 py-1 rounded">{item.text}</span>
                                                ) : item.type === "toggle" ? (
                                                    <label className="flex items-center gap-2 cursor-pointer bg-surfaceHighlight/20 px-3 py-1.5 rounded-lg w-fit">
                                                        <input 
                                                            type="checkbox" 
                                                            className="accent-primary"
                                                            checked={formData[key]?.[item.id] ?? item.default} 
                                                            onChange={e => updateItem(key, item.id, e.target.checked)} 
                                                        />
                                                        <span className={`text-xs font-bold ${ (formData[key]?.[item.id] ?? item.default) === (item.invert) ? "text-emerald-400" : "text-red-400"}`}>
                                                            {(formData[key]?.[item.id] ?? item.default) ? (item.invert ? "Normal" : "Positivo") : (item.invert ? "Anormal" : "Negativo")}
                                                        </span>
                                                    </label>
                                                ) : item.type === "select" ? (
                                                    <Select 
                                                        value={formData[key]?.[item.id] || item.default} 
                                                        onChange={e => updateItem(key, item.id, e.target.value)}
                                                        className="!py-1.5 !text-xs"
                                                    >
                                                        {item.options.map(o => <option key={o} value={o}>{o}</option>)}
                                                    </Select>
                                                ) : item.type === "textarea" ? (
                                                    <textarea 
                                                        rows={2}
                                                        value={formData[key]?.[item.id] || ""} 
                                                        onChange={e => updateItem(key, item.id, e.target.value)} 
                                                        className="w-full bg-background border border-border rounded-lg p-2 text-sm text-white focus:border-primary outline-none resize-y" 
                                                    />
                                                ) : (
                                                    <Input 
                                                        value={formData[key]?.[item.id] || ""} 
                                                        onChange={e => updateItem(key, item.id, e.target.value)} 
                                                        placeholder={item.placeholder || ""}
                                                        className="!py-1.5 !text-xs h-8"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <textarea 
                                        rows={2} 
                                        placeholder={`Detalles adicionales de ${config.title}...`} 
                                        value={formData[key]?.notas || ""} 
                                        onChange={e => updateItem(key, "notas", e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg p-2 text-sm text-white focus:border-primary outline-none mt-2" 
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