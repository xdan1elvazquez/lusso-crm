import React, { useState } from "react";
import { PE_REGIONS_CONFIG, getRegionalExamDefaults } from "@/utils/physicalExamRegionsConfig";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

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
    <div className="border border-border rounded-xl overflow-hidden mb-6 bg-surface/50">
        <div 
            onClick={() => setIsOpen(!isOpen)} 
            className="p-4 bg-surfaceHighlight/30 cursor-pointer flex justify-between items-center border-b border-border/50"
        >
            <div className="font-bold text-white text-lg">2. Exploración por Regiones</div>
            <span className="text-textMuted">{isOpen ? "▼" : "▶"}</span>
        </div>

        {isOpen && (
            <div className="p-4 grid gap-3 animate-fadeIn">
                {Object.values(PE_REGIONS_CONFIG).map(region => {
                    const isAbnormal = hasAbnormalities(region.id);
                    const isRegionOpen = openRegions[region.id];
                    
                    return (
                        <div 
                            key={region.id} 
                            className={`border rounded-xl overflow-hidden transition-all duration-200 ${isAbnormal ? "border-amber-500/50 bg-amber-900/10" : "border-border bg-background"}`}
                        >
                            <div 
                                onClick={() => toggleRegion(region.id)} 
                                className="p-3 flex justify-between items-center cursor-pointer hover:bg-white/5"
                            >
                                <span className={`font-bold text-sm ${isAbnormal ? "text-amber-400" : "text-textMuted"}`}>{region.title}</span>
                                <div className="flex gap-3 items-center">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setRegionNormal(region.id); }}
                                        className="text-[10px] bg-surface border border-border px-2 py-1 rounded text-textMuted hover:text-white hover:border-primary transition-colors"
                                    >
                                        Normal
                                    </button>
                                    <span className="text-xs text-textMuted">{isRegionOpen ? "▲" : "▼"}</span>
                                </div>
                            </div>
                            
                            {isRegionOpen && (
                                <div className="p-4 border-t border-border bg-black/20 grid gap-3">
                                    {region.items.map(item => (
                                        <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-border/30 pb-2 last:border-0 last:pb-0">
                                            <span className="text-sm text-gray-300 md:w-1/3">{item.label}</span>
                                            <div className="flex-1">
                                                {item.type === "toggle" ? (
                                                    <label className="flex items-center gap-2 cursor-pointer bg-surfaceHighlight/20 px-3 py-1.5 rounded-lg w-fit">
                                                        <input 
                                                            type="checkbox" 
                                                            className="accent-primary"
                                                            checked={formData[region.id]?.[item.id] ?? item.default} 
                                                            onChange={e => updateItem(region.id, item.id, e.target.checked)} 
                                                        />
                                                        <span className={`text-xs font-bold ${ (formData[region.id]?.[item.id] ?? item.default) === (item.invert) ? "text-emerald-400" : "text-red-400"}`}>
                                                            {(formData[region.id]?.[item.id] ?? item.default) ? (item.invert ? "Normal" : "Presente") : (item.invert ? "Anormal" : "Ausente")}
                                                        </span>
                                                    </label>
                                                ) : item.type === "select" ? (
                                                    <Select 
                                                        value={formData[region.id]?.[item.id] || item.default} 
                                                        onChange={e => updateItem(region.id, item.id, e.target.value)}
                                                        className="!py-1.5 !text-xs"
                                                    >
                                                        {item.options.map(o => <option key={o} value={o}>{o}</option>)}
                                                    </Select>
                                                ) : (
                                                    <Input 
                                                        value={formData[region.id]?.[item.id] || ""} 
                                                        onChange={e => updateItem(region.id, item.id, e.target.value)} 
                                                        placeholder={item.default ? `(Default: ${item.default})` : ""}
                                                        className="!py-1.5 !text-xs h-8"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <textarea 
                                        rows={2} 
                                        placeholder="Notas adicionales..." 
                                        value={formData[region.id]?.notas || ""} 
                                        onChange={e => updateItem(region.id, "notas", e.target.value)}
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