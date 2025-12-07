import React, { useState, useEffect } from "react";
import { 
  getDiabetesMeds, updateDiabetesMeds, 
  getHypertensionMeds, updateHypertensionMeds 
} from "@/services/settingsStorage";

// UI Kit
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SpecialDiseaseForm({ type, data, onChange }) {
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Cargar catálogo según tipo
  useEffect(() => {
    async function load() {
      try {
        let list = [];
        if (type === "DIABETES") list = await getDiabetesMeds();
        if (type === "HAS") list = await getHypertensionMeds();
        setCatalog(list || []);
      } catch (e) {
        console.error("Error cargando catálogo meds", e);
      } finally {
        setLoadingCatalog(false);
      }
    }
    load();
  }, [type]);

  const safeData = {
    diagnosisDate: "", evolution: "", maxValue: "", maxDate: "", controlStatus: "", 
    meds: [], ...data
  };

  const updateField = (field, val) => onChange({ ...safeData, [field]: val });

  const addMed = () => {
    onChange({ ...safeData, meds: [...safeData.meds, { id: Date.now(), name: "", dose: "", lastTake: "" }] });
  };

  const updateMed = (idx, field, val) => {
    const newMeds = [...safeData.meds];
    newMeds[idx][field] = val;
    onChange({ ...safeData, meds: newMeds });
  };

  const removeMed = (idx) => {
    onChange({ ...safeData, meds: safeData.meds.filter((_, i) => i !== idx) });
  };

  const saveToCatalog = async (medName) => {
    if (!medName || catalog.includes(medName)) return;
    if (!confirm(`¿Agregar "${medName}" al catálogo global de ${type}?`)) return;
    
    const newList = [...catalog, medName].sort();
    setCatalog(newList);
    
    if (type === "DIABETES") await updateDiabetesMeds(newList);
    if (type === "HAS") await updateHypertensionMeds(newList);
  };

  const themeColor = type === "DIABETES" ? "red" : "blue";
  const borderClass = type === "DIABETES" ? "border-red-500/50" : "border-blue-500/50";
  const bgClass = type === "DIABETES" ? "bg-red-900/10" : "bg-blue-900/10";
  const listId = `meds-list-${type}`;

  return (
    <div className={`mt-3 p-4 rounded-xl border-l-4 ${borderClass} ${bgClass} animate-fadeIn`}>
      <h4 className={`text-sm font-bold mb-4 flex items-center gap-2 ${type === "DIABETES" ? "text-red-400" : "text-blue-400"}`}>
        <span>{type === "DIABETES" ? "🩸" : "❤️"}</span>
        {type === "DIABETES" ? "Control Glucémico" : "Control Hipertensivo"}
      </h4>
      
      {/* CAMPOS CLÍNICOS */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input 
            label="Fecha Diagnóstico" 
            type="date" 
            value={safeData.diagnosisDate} 
            onChange={e => updateField("diagnosisDate", e.target.value)} 
            className="bg-surface/50 border-white/10"
        />
        <Input 
            label="Evolución" 
            placeholder="Ej. 5 años" 
            value={safeData.evolution} 
            onChange={e => updateField("evolution", e.target.value)} 
            className="bg-surface/50 border-white/10"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input 
            label={type === "DIABETES" ? "Glucosa Máxima" : "T/A Máxima"}
            placeholder={type === "DIABETES" ? "mg/dL" : "mm/Hg"} 
            value={safeData.maxValue} 
            onChange={e => updateField("maxValue", e.target.value)} 
            className="bg-surface/50 border-white/10"
        />
        <Input 
            label="Fecha del Máximo" 
            type="date" 
            value={safeData.maxDate} 
            onChange={e => updateField("maxDate", e.target.value)} 
            className="bg-surface/50 border-white/10"
        />
      </div>

      <div className="mb-4">
        <Input 
            label="Control Actual / Estabilización"
            placeholder="Ej. Controlado con dieta..." 
            value={safeData.controlStatus} 
            onChange={e => updateField("controlStatus", e.target.value)} 
            className="bg-surface/50 border-white/10"
        />
      </div>

      {/* SECCIÓN MEDICAMENTOS */}
      <div className="bg-black/20 p-3 rounded-lg border border-white/10">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-textMuted uppercase">Medicamentos ({safeData.meds.length})</span>
          <Button onClick={addMed} variant="ghost" className="text-xs py-1 px-2 h-auto text-emerald-400 hover:bg-emerald-500/10">+ Agregar</Button>
        </div>
        
        <datalist id={listId}>
            {catalog.map(opt => <option key={opt} value={opt} />)}
        </datalist>

        {safeData.meds.length === 0 && <div className="text-xs text-textMuted italic text-center py-2">Sin medicamentos registrados.</div>}
        
        <div className="space-y-3">
            {safeData.meds.map((med, i) => {
                const isKnown = catalog.includes(med.name);
                return (
                  <div key={med.id} className="p-2 border-b border-white/5 last:border-0">
                    <div className="flex gap-2 mb-2 items-center">
                        <div className="flex-1 relative">
                            <input 
                                list={listId}
                                placeholder="Buscar medicamento..." 
                                value={med.name} 
                                onChange={e => updateMed(i, "name", e.target.value)} 
                                className={`w-full bg-surface border rounded px-2 py-1 text-xs text-white focus:outline-none ${med.name && !isKnown ? "border-amber-500/50 focus:border-amber-500" : "border-border focus:border-primary"}`} 
                            />
                            {med.name && !isKnown && !loadingCatalog && (
                                <button 
                                    type="button"
                                    onClick={() => saveToCatalog(med.name)}
                                    title="Guardar en catálogo"
                                    className="absolute right-2 top-1 text-xs text-amber-400 hover:text-amber-300"
                                >
                                    💾
                                </button>
                            )}
                        </div>
                        <button onClick={() => removeMed(i)} className="text-red-400 hover:text-red-300 px-1">✕</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input placeholder="Dosis (Ej. 1-0-1)" value={med.dose} onChange={e => updateMed(i, "dose", e.target.value)} className="bg-surface border border-border rounded px-2 py-1 text-xs text-white focus:border-primary outline-none" />
                        <input placeholder="Última toma" value={med.lastTake} onChange={e => updateMed(i, "lastTake", e.target.value)} className="bg-surface border border-border rounded px-2 py-1 text-xs text-white focus:border-primary outline-none" />
                    </div>
                  </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}