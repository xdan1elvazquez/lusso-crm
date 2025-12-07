import React, { useState } from "react";
import { PE_GENERAL_CONFIG, GLASGOW_OPTS, getPhysicalExamDefaults } from "@/utils/physicalExamConfig";

// UI Kit
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

export default function PhysicalExamGeneralForm({ data, onChange }) {
  const [isOpen, setIsOpen] = useState(true);
  const formData = data || getPhysicalExamDefaults();

  const updateSection = (section, field, value) => {
    const nextSection = { ...formData[section], [field]: value };
    
    // Auto-cálculo IMC
    if (section === "anthro" && (field === "peso" || field === "talla")) {
        const p = parseFloat(field === "peso" ? value : nextSection.peso);
        const t = parseFloat(field === "talla" ? value : nextSection.talla);
        if (p > 0 && t > 0) nextSection.imc = (p / (t * t)).toFixed(2);
    }

    // Auto-cálculo Glasgow
    if (section === "mental" && field === "glasgow") {
       nextSection.glasgow.total = parseInt(nextSection.glasgow.e) + parseInt(nextSection.glasgow.v) + parseInt(nextSection.glasgow.m);
    }

    onChange({ ...formData, [section]: nextSection });
  };

  const handleGlasgowChange = (component, val) => {
      const currentG = formData.mental?.glasgow || { e: 4, v: 5, m: 6, total: 15 };
      updateSection("mental", "glasgow", { ...currentG, [component]: parseInt(val) });
  };

  const handleOrientationChange = (key, checked) => {
      const current = formData.mental?.orientacion || { tiempo: true, espacio: true, persona: true };
      updateSection("mental", "orientacion", { ...current, [key]: checked });
  };

  const setAllNormal = () => {
      onChange(getPhysicalExamDefaults());
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-6 bg-surface/50">
        <div 
            onClick={() => setIsOpen(!isOpen)} 
            className="p-4 bg-surfaceHighlight/30 cursor-pointer flex justify-between items-center border-b border-border/50"
        >
            <div className="font-bold text-white text-lg">1. Exploración Física General</div>
            <div className="flex items-center gap-3">
                <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); setAllNormal(); }} 
                    className="text-xs px-2 py-1 bg-surface border border-border text-textMuted rounded hover:text-white hover:border-primary transition-colors"
                >
                    Todo Normal
                </button>
                <span className="text-textMuted">{isOpen ? "▼" : "▶"}</span>
            </div>
        </div>

        {isOpen && (
            <div className="p-6 space-y-8 animate-fadeIn">
                
                {/* 1. SIGNOS VITALES */}
                <div>
                    <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4 border-b border-border pb-2">{PE_GENERAL_CONFIG.vitals.title}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {PE_GENERAL_CONFIG.vitals.fields.map(f => (
                            <div key={f.id} className={f.width > 80 ? "col-span-2" : "col-span-1"}>
                                <Input 
                                    label={f.label} 
                                    type={f.type} 
                                    value={formData.vitals?.[f.id] || ""} 
                                    onChange={e => updateSection("vitals", f.id, e.target.value)} 
                                    placeholder={f.placeholder} 
                                    className="h-10 text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. ANTROPOMETRÍA */}
                <div>
                    <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 border-b border-border pb-2">{PE_GENERAL_CONFIG.anthro.title}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {PE_GENERAL_CONFIG.anthro.fields.map(f => (
                            <div key={f.id}>
                                <Input 
                                    label={f.label}
                                    type={f.type} 
                                    value={formData.anthro?.[f.id] || ""} 
                                    onChange={e => updateSection("anthro", f.id, e.target.value)} 
                                    className={f.readOnly ? "text-amber-400 font-bold bg-amber-900/10 border-amber-500/30" : ""}
                                    disabled={f.readOnly}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. HABITUS */}
                <div>
                    <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-4 border-b border-border pb-2">{PE_GENERAL_CONFIG.habitus.title}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {PE_GENERAL_CONFIG.habitus.fields.map(f => (
                            <div key={f.id} className={f.id==="dolor_aparente" ? "col-span-2" : ""}>
                                {f.type === "select" ? (
                                    <Select label={f.label} value={formData.habitus?.[f.id] || f.default} onChange={e => updateSection("habitus", f.id, e.target.value)}>
                                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                    </Select>
                                ) : f.type === "boolean" || f.type === "boolean_detail" ? (
                                    <div className="bg-surfaceHighlight/20 p-3 rounded-lg border border-border">
                                        <label className="flex items-center gap-3 cursor-pointer mb-2">
                                            <input 
                                                type="checkbox" 
                                                className="accent-primary w-4 h-4"
                                                checked={formData.habitus?.[f.id]?.active ?? formData.habitus?.[f.id]} 
                                                onChange={e => updateSection("habitus", f.id, f.type==="boolean"? e.target.checked : { active: e.target.checked, detail: "" })} 
                                            />
                                            <span className="text-sm font-medium text-white">{f.label}</span>
                                        </label>
                                        {f.type === "boolean_detail" && formData.habitus?.[f.id]?.active && (
                                            <Input 
                                                placeholder={f.detailLabel} 
                                                value={formData.habitus?.[f.id]?.detail || ""} 
                                                onChange={e => updateSection("habitus", f.id, { active: true, detail: e.target.value })} 
                                                className="h-8 text-xs"
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <Input label={f.label} value={formData.habitus?.[f.id] || f.default} onChange={e => updateSection("habitus", f.id, e.target.value)} placeholder={f.placeholder} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. MENTAL */}
                <div>
                    <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 border-b border-border pb-2">{PE_GENERAL_CONFIG.mental.title}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* GLASGOW CARD */}
                        <div className="bg-surface border border-border rounded-xl p-4">
                            <div className="text-sm font-bold text-purple-400 mb-4">Escala de Glasgow</div>
                            <div className="space-y-3">
                                {["eye", "verbal", "motor"].map(k => (
                                    <Select 
                                        key={k} 
                                        label={k.toUpperCase()} 
                                        value={formData.mental?.glasgow?.[k.charAt(0)] || 4} 
                                        onChange={e => handleGlasgowChange(k.charAt(0), e.target.value)}
                                    >
                                        {GLASGOW_OPTS[k].map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                                    </Select>
                                ))}
                                <div className="mt-4 p-2 bg-emerald-900/30 text-emerald-400 text-center font-bold rounded-lg border border-emerald-500/30">
                                    Total: {formData.mental?.glasgow?.total || 15} / 15
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <span className="text-xs font-bold text-textMuted uppercase mb-2 block">Orientación</span>
                                <div className="flex gap-4">
                                    {PE_GENERAL_CONFIG.mental.orientation.map(o => (
                                        <label key={o.id} className="flex items-center gap-2 cursor-pointer bg-surfaceHighlight/30 px-3 py-2 rounded-lg border border-border hover:border-primary/50 transition-colors">
                                            <input 
                                                type="checkbox" 
                                                className="accent-primary"
                                                checked={formData.mental?.orientacion?.[o.id] ?? true} 
                                                onChange={e => handleOrientationChange(o.id, e.target.checked)} 
                                            /> 
                                            <span className="text-sm text-white">{o.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {PE_GENERAL_CONFIG.mental.functions.map(f => (
                                    <div key={f.id}>
                                        {f.type === "select" ? (
                                            <Select label={f.label} value={formData.mental?.[f.id] || f.default} onChange={e => updateSection("mental", f.id, e.target.value)}>
                                                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                            </Select>
                                        ) : <Input label={f.label} value={formData.mental?.[f.id] || f.default} onChange={e => updateSection("mental", f.id, e.target.value)} />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        )}
    </div>
  );
}