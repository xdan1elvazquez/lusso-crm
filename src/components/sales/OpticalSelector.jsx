import React, { useState, useMemo } from "react";
import { checkLensCompatibility, getSuggestions } from "@/utils/lensMatcher";
// UI Components
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select"; // Asumimos que tienes este o usaremos el estilo nativo de Tailwind

export default function OpticalSelector({ 
    show, 
    onToggle, 
    currentRx, 
    catalog, 
    itemDetails, 
    setItemDetails, 
    onAddSmart, 
    onAddManual 
}) {
  const [filters, setFilters] = useState({ design: "", material: "", treatment: "" });
  const [lensQuery, setLensQuery] = useState("");

  const filterOptions = useMemo(() => {
    const designs = new Set(); const materials = new Set(); const treatments = new Set();
    catalog.forEach(l => { if(l.design) designs.add(l.design); if(l.material) materials.add(l.material); if(l.treatment) treatments.add(l.treatment); });
    return { designs: Array.from(designs).sort(), materials: Array.from(materials).sort(), treatments: Array.from(treatments).sort() };
  }, [catalog]);

  const { validLenses, suggestions } = useMemo(() => {
    if (!show || (!currentRx.od.sph && currentRx.od.sph !== 0)) return { validLenses: [], suggestions: [] };
    
    let results = catalog;
    if (filters.design) results = results.filter(l => l.design === filters.design);
    if (filters.material) results = results.filter(l => l.material === filters.material);
    if (filters.treatment) results = results.filter(l => l.treatment === filters.treatment);

    const compatibles = []; 
    const incompatibleReasons = new Set();
    
    results.forEach(lens => {
        const check = checkLensCompatibility(lens, currentRx);
        if (check.compatible) compatibles.push({ ...lens, calculatedCost: check.cost, calculatedPrice: check.price });
        else incompatibleReasons.add(check.reason);
    });

    let generatedSuggestions = [];
    if (compatibles.length === 0 && (filters.design || filters.material)) {
        generatedSuggestions = getSuggestions(catalog, currentRx, filters);
        if (generatedSuggestions.length === 0 && incompatibleReasons.size > 0) generatedSuggestions.push(`Fuera de rango: ${Array.from(incompatibleReasons)[0]}`);
    }
    return { validLenses: compatibles, suggestions: generatedSuggestions };
  }, [catalog, filters, currentRx, show]);

  const filteredManualLenses = useMemo(() => {
    if (!lensQuery) return [];
    return catalog.filter(l => l.name.toLowerCase().includes(lensQuery.toLowerCase())).slice(0, 5);
  }, [catalog, lensQuery]);

  if (!show) {
      return (
        <Button 
            variant="ghost" 
            onClick={onToggle} 
            className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary"
        >
            + 👓 Agregar Lentes Graduados
        </Button>
      );
  }

  // Estilo base para selects internos
  const selectClass = "w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-textMain focus:border-primary outline-none appearance-none cursor-pointer hover:bg-surfaceHighlight transition-colors";

  return (
    <div className="bg-surface/50 border border-primary/20 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <div className="text-xs font-bold text-primary uppercase tracking-wider">Selector Inteligente (Rx)</div>
            <button onClick={onToggle} className="text-xs text-textMuted hover:text-white">Ocultar</button>
        </div>
        
        {/* Toggle Servicios */}
        <div className="flex gap-4 mb-4 p-3 bg-background rounded-lg border border-border">
            <span className="text-xs font-bold text-textMuted uppercase self-center">Servicios:</span>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-textMain hover:text-white">
                <input type="checkbox" checked={itemDetails.requiresBisel} onChange={e => setItemDetails({...itemDetails, requiresBisel: e.target.checked})} className="accent-primary" />
                🛠️ Bisel
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-textMain hover:text-white">
                <input type="checkbox" checked={itemDetails.requiresTallado} onChange={e => setItemDetails({...itemDetails, requiresTallado: e.target.checked})} className="accent-primary" />
                ⚙️ Tallado
            </label>
        </div>

        {/* Filtros Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
            <select value={filters.design} onChange={e => setFilters({...filters, design: e.target.value})} className={selectClass}>
                <option value="">Diseño (Todos)</option>
                {filterOptions.designs.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={filters.material} onChange={e => setFilters({...filters, material: e.target.value})} className={selectClass}>
                <option value="">Material (Todos)</option>
                {filterOptions.materials.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filters.treatment} onChange={e => setFilters({...filters, treatment: e.target.value})} className={selectClass}>
                <option value="">Tratamiento (Todos)</option>
                {filterOptions.treatments.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
        </div>

        {/* Lista Resultados */}
        <div className="max-h-48 overflow-y-auto custom-scrollbar border border-border rounded-lg bg-background mb-4">
            {validLenses.length > 0 ? validLenses.map(l => (
                <div 
                    key={l.id} 
                    onClick={() => onAddSmart(l)} 
                    className="p-3 cursor-pointer border-b border-border last:border-0 hover:bg-surfaceHighlight/50 transition-colors flex justify-between items-center group"
                >
                    <div>
                        <div className="font-bold text-white text-sm group-hover:text-primary transition-colors">{l.name}</div>
                        <div className="text-xs text-textMuted">{l.labName} · {l.material}</div>
                    </div>
                    <div className="font-bold text-emerald-400 text-sm">${l.calculatedPrice?.toLocaleString()}</div>
                </div>
            )) : (
                <div className="p-6 text-center text-xs text-textMuted italic">
                    {suggestions.length > 0 ? (
                        <div className="text-left text-amber-400 space-y-1">
                            {suggestions.map((s, i) => <div key={i}>• {s}</div>)}
                        </div>
                    ) : (
                        currentRx.od.sph !== null ? "Usa los filtros para encontrar micas compatibles." : "Carga una Rx primero para ver opciones inteligentes."
                    )}
                </div>
            )}
        </div>
        
        {/* Búsqueda Manual Fallback */}
        <div className="relative pt-3 border-t border-border border-dashed">
            <input 
                value={lensQuery} 
                onChange={e => setLensQuery(e.target.value)} 
                placeholder="¿No aparece? Busca manualmente..." 
                className="w-full bg-transparent text-sm text-textMuted placeholder-textMuted/50 focus:text-white outline-none"
            />
             {lensQuery && filteredManualLenses.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-border rounded-lg shadow-xl z-30 overflow-hidden">
                    {filteredManualLenses.map(l => (
                        <div key={l.id} onClick={() => { onAddManual(l); setLensQuery(""); }} className="p-3 hover:bg-primary/20 cursor-pointer text-sm text-textMain border-b border-border last:border-0">
                            {l.name}
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Detalles Extra Armazón */}
        <div className="grid grid-cols-[1fr_auto] gap-3 mt-3">
             <input 
                placeholder="Armazón (Marca/Modelo)" 
                value={itemDetails.frameModel} 
                onChange={e => setItemDetails({...itemDetails, frameModel:e.target.value})} 
                className={selectClass}
             />
             <select 
                value={itemDetails.frameStatus} 
                onChange={e => setItemDetails({...itemDetails, frameStatus:e.target.value})} 
                className={`${selectClass} w-24`}
             >
                <option value="NUEVO">Nuevo</option>
                <option value="USADO">Usado</option>
                <option value="PROPIO">Propio</option>
             </select>
        </div>
    </div>
  );
}