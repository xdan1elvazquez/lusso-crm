import React from "react";
import { OCULAR_DISEASES, OCULAR_SYMPTOMS } from "@/utils/anamnesisOcularConfig";
import Input from "@/components/ui/Input";

export default function OcularHistoryForm({ data, onChange }) {
  // Lógica original intacta
  const hx = data || {};
  const update = (field, value) => onChange({ ...hx, [field]: value });
  const updateSub = (category, key, val) => update(category, { ...(hx[category] || {}), [key]: val });

  return (
    <div className="space-y-8 animate-[fadeIn_0.2s_ease-out]">
      
      {/* 1. LENTES */}
      <div>
        <h4 className="text-sm font-bold text-emerald-400 mb-3 border-b border-border pb-1">1. Corrección Óptica (Gafas)</h4>
        <div className="flex gap-4 mb-3">
            {[{v: true, l:"Sí usa"}, {v: false, l:"No usa"}].map(opt => (
                <label key={opt.l} className="flex items-center gap-2 cursor-pointer bg-surfaceHighlight/30 px-3 py-1.5 rounded-lg border border-border hover:border-emerald-500/50 transition-colors">
                    <input 
                        type="radio" 
                        checked={hx.glasses?.uses === opt.v} 
                        onChange={() => updateSub("glasses", "uses", opt.v)} 
                        className="accent-emerald-500 w-4 h-4 cursor-pointer" 
                    />
                    <span className="text-sm text-white">{opt.l}</span>
                </label>
            ))}
        </div>
        {hx.glasses?.uses && (
            <div className="bg-surface p-4 rounded-xl border border-border grid gap-4 animate-[fadeIn_0.2s]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="¿Desde cuándo?" value={hx.glasses?.since || ""} onChange={e => updateSub("glasses", "since", e.target.value)} placeholder="Año o edad" />
                    <Input label="Última Graduación" type="date" value={hx.glasses?.lastRxDate || ""} onChange={e => updateSub("glasses", "lastRxDate", e.target.value)} />
                </div>
                <Input label="Problemas actuales" value={hx.glasses?.issues || ""} onChange={e => updateSub("glasses", "issues", e.target.value)} placeholder="Ve borroso, pesan..." />
            </div>
        )}
      </div>

      {/* 2. LENTES DE CONTACTO */}
      <div>
        <h4 className="text-sm font-bold text-blue-400 mb-3 border-b border-border pb-1">2. Lentes de Contacto (LC)</h4>
        <div className="flex gap-4 mb-3">
            {[{v: true, l:"Sí usa / usó"}, {v: false, l:"Niega uso"}].map(opt => (
                <label key={opt.l} className="flex items-center gap-2 cursor-pointer bg-surfaceHighlight/30 px-3 py-1.5 rounded-lg border border-border hover:border-blue-500/50 transition-colors">
                    <input 
                        type="radio" 
                        checked={hx.contactLenses?.uses === opt.v} 
                        onChange={() => updateSub("contactLenses", "uses", opt.v)} 
                        className="accent-blue-500 w-4 h-4 cursor-pointer" 
                    />
                    <span className="text-sm text-white">{opt.l}</span>
                </label>
            ))}
        </div>
        {hx.contactLenses?.uses && (
            <div className="bg-surface p-4 rounded-xl border border-border grid grid-cols-1 md:grid-cols-2 gap-4 animate-[fadeIn_0.2s]">
                <Input label="Tipo" placeholder="Blandos, RGP..." value={hx.contactLenses?.type || ""} onChange={e => updateSub("contactLenses", "type", e.target.value)} />
                <Input label="Frecuencia" placeholder="Horas/día" value={hx.contactLenses?.frequency || ""} onChange={e => updateSub("contactLenses", "frequency", e.target.value)} />
                <Input label="Solución" value={hx.contactLenses?.solution || ""} onChange={e => updateSub("contactLenses", "solution", e.target.value)} />
                <Input label="Complicaciones" value={hx.contactLenses?.issues || ""} onChange={e => updateSub("contactLenses", "issues", e.target.value)} />
            </div>
        )}
      </div>

      {/* 3. ENFERMEDADES */}
      <div>
        <h4 className="text-sm font-bold text-amber-400 mb-3 border-b border-border pb-1">3. Enfermedades Oculares Previas</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-surface p-4 rounded-xl border border-border mb-3">
            {OCULAR_DISEASES.map(dis => {
                const isActive = hx.diseases?.[dis.id]?.active || false;
                return (
                    <div key={dis.id} className={`p-2 rounded transition-colors ${isActive ? "bg-amber-900/20" : ""}`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={isActive} 
                                onChange={e => {
                                    // Misma lógica: preservamos notas si ya existían
                                    const next = { active: e.target.checked, notes: hx.diseases?.[dis.id]?.notes || "" };
                                    updateSub("diseases", dis.id, next);
                                }} 
                                className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                            />
                            <span className={`text-sm ${isActive ? "text-white font-medium" : "text-textMuted"}`}>{dis.label}</span>
                        </label>
                        {isActive && (
                            <input 
                                placeholder="Detalles (ojo, tiempo...)" 
                                value={hx.diseases?.[dis.id]?.notes || ""} 
                                onChange={e => updateSub("diseases", dis.id, { active: true, notes: e.target.value })} 
                                className="w-full bg-transparent border-b border-amber-500/30 text-xs text-white px-1 py-1 mt-1 focus:outline-none focus:border-amber-500 animate-[fadeIn_0.2s]" 
                            />
                        )}
                    </div>
                );
            })}
        </div>
        <Input label="Otras condiciones" value={hx.diseases?.other || ""} onChange={e => updateSub("diseases", "other", e.target.value)} />
      </div>

      {/* 4. CIRUGÍAS Y TRAUMA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-red-900/5 border border-red-500/20 p-4 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer mb-2 font-bold text-red-400">
                  <input type="checkbox" checked={hx.surgeries?.active || false} onChange={e => updateSub("surgeries", "active", e.target.checked)} className="accent-red-500 w-4 h-4 cursor-pointer" />
                  4. Cirugías Oculares
              </label>
              {hx.surgeries?.active && (
                  <textarea rows={3} placeholder="Describir: Tipo, fecha y ojo..." value={hx.surgeries?.details || ""} onChange={e => updateSub("surgeries", "details", e.target.value)} className="w-full bg-surface border border-border rounded-lg p-2 text-sm text-white resize-none focus:border-red-500/50 outline-none" />
              )}
          </div>
          <div className="bg-red-900/5 border border-red-500/20 p-4 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer mb-2 font-bold text-red-400">
                  <input type="checkbox" checked={hx.trauma?.active || false} onChange={e => updateSub("trauma", "active", e.target.checked)} className="accent-red-500 w-4 h-4 cursor-pointer" />
                  5. Traumatismos
              </label>
              {hx.trauma?.active && (
                  <textarea rows={3} placeholder="Describir: Objeto, fecha, secuelas..." value={hx.trauma?.details || ""} onChange={e => updateSub("trauma", "details", e.target.value)} className="w-full bg-surface border border-border rounded-lg p-2 text-sm text-white resize-none focus:border-red-500/50 outline-none" />
              )}
          </div>
      </div>

      {/* 6. MEDICAMENTOS OCULARES */}
      <div className="bg-surface p-4 rounded-xl border border-border">
          <h4 className="text-sm font-bold text-purple-400 mb-3 border-b border-border pb-1">6. Medicamentos / Gotas Actuales</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input 
                label="Nombre (ej. Humylub)" 
                value={hx.meds?.[0]?.name || ""} 
                onChange={e => {
                    // Lógica original: crear array si no existe
                    const newMeds = [...(hx.meds || [])];
                    if(!newMeds[0]) newMeds[0] = { name: "", dose: "" };
                    newMeds[0].name = e.target.value;
                    update("meds", newMeds);
                }} 
              />
              <Input 
                label="Dosis / Frecuencia" 
                value={hx.meds?.[0]?.dose || ""} 
                onChange={e => {
                    const newMeds = [...(hx.meds || [])];
                    if(!newMeds[0]) newMeds[0] = { name: "", dose: "" };
                    newMeds[0].dose = e.target.value;
                    update("meds", newMeds);
                }} 
              />
          </div>
          <div>
            <label className="block text-xs font-bold text-textMuted uppercase mb-1">Alergias a gotas o medicamentos</label>
            <textarea 
                placeholder="Describir alergias..." 
                value={hx.allergies || ""} 
                onChange={e => update("allergies", e.target.value)} 
                className="w-full bg-background border border-red-500/30 rounded-lg p-2 text-sm text-white resize-none focus:border-red-500 outline-none" 
            />
          </div>
      </div>

      {/* 7. SÍNTOMAS (CHIPS) */}
      <div>
          <h4 className="text-sm font-bold text-textMuted uppercase mb-3">7. Sintomatología Frecuente</h4>
          <div className="flex flex-wrap gap-2">
              {OCULAR_SYMPTOMS.map(sym => (
                  <label key={sym.id} className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border select-none ${hx.symptoms?.[sym.id] ? "bg-blue-600 text-white border-blue-500 shadow-glow" : "bg-surface text-textMuted border-border hover:border-primary hover:text-white"}`}>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={hx.symptoms?.[sym.id] || false} 
                        onChange={e => updateSub("symptoms", sym.id, e.target.checked)} 
                      />
                      {hx.symptoms?.[sym.id] ? "✓ " : "+ "}{sym.label}
                  </label>
              ))}
          </div>
      </div>

    </div>
  );
}