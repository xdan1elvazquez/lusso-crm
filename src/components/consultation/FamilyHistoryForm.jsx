import React from "react";
import { RELATIVES_CONFIG } from "@/utils/anamnesisFamilyConfig";

// UI Kit
import Input from "@/components/ui/Input";

export default function FamilyHistoryForm({ data, onChange }) {
  const familyData = data || { relatives: {}, ophthalmic: {} };

  const updateRelative = (id, field, val) => {
    const current = familyData.relatives?.[id] || { negated: false };
    const next = { ...current, [field]: val };
    if (field === "negated" && val === true) {
        next.diseases = ""; next.treatment = ""; next.vitalStatus = "UNKNOWN";
    }
    onChange({ ...familyData, relatives: { ...familyData.relatives, [id]: next } });
  };

  const updateOphthalmic = (relId, field, val) => {
      const current = familyData.ophthalmic?.[relId] || { negated: true };
      const next = { ...current, [field]: val };
      onChange({ ...familyData, ophthalmic: { ...familyData.ophthalmic, [relId]: next } });
  };

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1: SISTÉMICOS */}
      <div>
        <h4 className="text-sm font-bold text-blue-400 mb-4 border-b border-border pb-2">A. Enfermedades Sistémicas / Estado Vital</h4>
        <div className="grid gap-3">
            {RELATIVES_CONFIG.map(rel => {
                const relData = familyData.relatives?.[rel.id] || { negated: false, vitalStatus: "ALIVE" };
                const isNegated = relData.negated;

                return (
                    <div 
                        key={rel.id} 
                        className={`border rounded-lg p-3 transition-all ${isNegated ? "border-border bg-surface opacity-60" : "border-amber-500/40 bg-amber-900/5"}`}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                                <strong className="text-white text-sm">{rel.label}</strong>
                                <label className="flex items-center gap-2 cursor-pointer bg-black/30 px-2 py-1 rounded">
                                    <input 
                                        type="checkbox" 
                                        checked={isNegated} 
                                        onChange={e => updateRelative(rel.id, "negated", e.target.checked)} 
                                        className="accent-gray-500"
                                    />
                                    <span className="text-xs text-textMuted">Negado / Sano</span>
                                </label>
                            </div>
                            {rel.hasCount && (
                                <input 
                                    type="number" 
                                    placeholder="#" 
                                    className="w-12 bg-background border border-border rounded text-center text-sm py-1 outline-none focus:border-primary"
                                    value={relData.count || ""}
                                    onChange={e => updateRelative(rel.id, "count", e.target.value)}
                                />
                            )}
                        </div>

                        {!isNegated && (
                            <div className="animate-fadeIn space-y-3 pl-2 border-l-2 border-amber-500/20">
                                {/* Estado Vital */}
                                <div className="flex gap-4 items-center">
                                    <span className="text-xs text-textMuted uppercase font-bold">Estado:</span>
                                    {["ALIVE", "DECEASED", "UNKNOWN"].map(status => (
                                        <label key={status} className="flex items-center gap-1 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name={`status-${rel.id}`} 
                                                checked={relData.vitalStatus === status} 
                                                onChange={() => updateRelative(rel.id, "vitalStatus", status)}
                                                className="accent-primary"
                                            />
                                            <span className={`text-xs ${relData.vitalStatus === status ? "text-white" : "text-textMuted"}`}>
                                                {status === "ALIVE" ? "Vivo" : status === "DECEASED" ? "Finado" : "Desc."}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                
                                {relData.vitalStatus === "DECEASED" && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input placeholder="Causa fallecimiento" value={relData.deathCause || ""} onChange={e => updateRelative(rel.id, "deathCause", e.target.value)} className="h-8 text-xs" />
                                        <Input placeholder="Tiempo (años)" value={relData.deathTime || ""} onChange={e => updateRelative(rel.id, "deathTime", e.target.value)} className="h-8 text-xs" />
                                    </div>
                                )}

                                <Input 
                                    label="Enfermedades (Diabetes, HAS, Cáncer...)" 
                                    value={relData.diseases || ""} 
                                    onChange={e => updateRelative(rel.id, "diseases", e.target.value)} 
                                    className="h-9 text-sm"
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>

      {/* SECCIÓN 2: OFTALMOLÓGICOS */}
      <div>
          <h4 className="text-sm font-bold text-purple-400 mb-4 border-b border-border pb-2">B. Heredofamiliares Oftalmológicos</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {RELATIVES_CONFIG.map(rel => {
                  const ophData = familyData.ophthalmic?.[rel.id] || { negated: true };
                  if (ophData.negated) {
                      return (
                          <div key={rel.id} className="flex justify-between items-center p-2 bg-surface rounded border border-border">
                              <span className="text-sm text-textMuted">{rel.label}</span>
                              <button onClick={() => updateOphthalmic(rel.id, "negated", false)} className="text-xs text-emerald-400 hover:underline">+ Agregar</button>
                          </div>
                      );
                  }
                  return (
                      <div key={rel.id} className="bg-purple-900/10 p-3 rounded-lg border border-purple-500/30">
                          <div className="flex justify-between mb-2">
                              <strong className="text-white text-sm">{rel.label}</strong>
                              <button onClick={() => updateOphthalmic(rel.id, "negated", true)} className="text-xs text-red-400 hover:text-red-300">Cancelar</button>
                          </div>
                          <div className="space-y-2">
                              <Input placeholder="Padecimiento (Glaucoma, etc)" value={ophData.condition || ""} onChange={e => updateOphthalmic(rel.id, "condition", e.target.value)} className="h-8 text-xs" />
                              <Input placeholder="Tratamiento" value={ophData.treatment || ""} onChange={e => updateOphthalmic(rel.id, "treatment", e.target.value)} className="h-8 text-xs" />
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>
    </div>
  );
}