import React, { useState } from "react";
import { OPHTHALMO_CONFIG, getOphthalmoDefaults } from "@/utils/ophthalmologyConfig";

// UI Kit
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";

export default function OphthalmologyExamForm({ data, onChange }) {
  const [isOpen, setIsOpen] = useState(true);
  const [openSections, setOpenSections] = useState({});
  const formData = data || getOphthalmoDefaults();

  const toggleSection = (id) => setOpenSections(p => ({ ...p, [id]: !p[id] }));

  const updateField = (sectionKey, eye, fieldId, value) => {
    const sectionData = formData[sectionKey] || { od: {}, os: {}, isNormal: false };
    const eyeData = sectionData[eye] || {};
    
    onChange({
      ...formData,
      [sectionKey]: {
        ...sectionData,
        isNormal: false,
        [eye]: { ...eyeData, [fieldId]: value }
      }
    });
  };

  const setSectionNormal = (sectionKey) => {
    const defaults = getOphthalmoDefaults()[sectionKey];
    onChange({ ...formData, [sectionKey]: defaults });
  };

  const renderInput = (field, eye, sectionKey) => {
    const val = formData[sectionKey]?.[eye]?.[field.id] || "";
    
    if (field.type === "select") {
      return (
        <Select 
          value={val} 
          onChange={e => updateField(sectionKey, eye, field.id, e.target.value)}
          className="!py-1.5 !text-xs h-8"
        >
          <option value="">--</option>
          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
        </Select>
      );
    }
    
    return (
      <Input 
        type={field.type === "number" ? "number" : "text"}
        value={val} 
        onChange={e => updateField(sectionKey, eye, field.id, e.target.value)} 
        placeholder={field.placeholder || field.default || ""}
        className="!py-1.5 !text-xs h-8"
      />
    );
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-6 bg-surface/50">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-4 bg-surfaceHighlight/30 cursor-pointer flex justify-between items-center border-b border-border/50"
      >
        <div className="font-bold text-blue-400 text-lg">3. Exploración Oftalmológica Detallada</div>
        <span className="text-textMuted">{isOpen ? "▼" : "▶"}</span>
      </div>

      {isOpen && (
        <div className="p-4 space-y-4 animate-fadeIn">
          {Object.entries(OPHTHALMO_CONFIG).map(([key, config]) => {
            const isNormal = formData[key]?.isNormal;
            return (
              <div 
                key={key} 
                className={`border rounded-xl overflow-hidden transition-all ${isNormal ? "border-border bg-background" : "border-amber-500/40 bg-amber-900/5"}`}
              >
                <div 
                    onClick={() => toggleSection(key)} 
                    className="p-3 flex justify-between items-center cursor-pointer hover:bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-sm ${isNormal ? "text-textMuted" : "text-amber-400"}`}>{config.title}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSectionNormal(key); }}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${isNormal ? "bg-emerald-900/20 text-emerald-400 border-emerald-500/30" : "bg-surface text-textMuted border-border hover:text-white"}`}
                    >
                      {isNormal ? "✓ Normal" : "Marcar Normal"}
                    </button>
                  </div>
                  <span className="text-xs text-textMuted">{openSections[key] ? "▲" : "▼"}</span>
                </div>

                {openSections[key] && (
                  <div className="p-4 border-t border-border bg-black/20">
                    <div className="grid grid-cols-2 gap-6">
                      {/* OJO DERECHO */}
                      <div className="space-y-3">
                        <div className="text-xs font-bold text-blue-400 text-center border-b border-blue-500/30 pb-1 mb-2">OD (Derecho)</div>
                        {config.sections.map(field => (
                          <div key={field.id}>
                            <span className="text-[10px] text-textMuted uppercase mb-1 block">{field.label}</span>
                            {renderInput(field, 'od', key)}
                          </div>
                        ))}
                      </div>
                      
                      {/* OJO IZQUIERDO */}
                      <div className="space-y-3">
                        <div className="text-xs font-bold text-green-400 text-center border-b border-green-500/30 pb-1 mb-2">OI (Izquierdo)</div>
                        {config.sections.map(field => (
                          <div key={field.id}>
                            <span className="text-[10px] text-textMuted uppercase mb-1 block">{field.label}</span>
                            {renderInput(field, 'os', key)}
                          </div>
                        ))}
                      </div>
                    </div>
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