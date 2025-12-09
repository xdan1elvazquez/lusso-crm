import React, { useState, useMemo, useEffect } from "react";
import { checkLensCompatibility, getSuggestions, normalizeLensData } from "@/utils/lensMatcher"; 
import Button from "@/components/ui/Button";

export default function OpticalSelector({ 
    show, onToggle, currentRx, catalog, itemDetails, setItemDetails, onAddSmart, onAddManual 
}) {
  const [filters, setFilters] = useState({ design: "", material: "", treatment: "" });
  const [lensQuery, setLensQuery] = useState("");
  
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [manualPriceInput, setManualPriceInput] = useState("");

  // 1. NORMALIZACIÓN AL INICIO
  const normalizedCatalog = useMemo(() => {
      if (!catalog) return [];
      return catalog.map(l => normalizeLensData(l));
  }, [catalog]);

  // ⚠️ ELIMINADO: El useEffect que reseteaba filtros automáticamente y borraba la importación
  // useEffect(() => { setFilters(prev => ({...prev, material: "", treatment: ""})); }, [filters.design]);

  // 🔥 EFECTO DE IMPORTACIÓN: Carga recomendaciones del examen si existen
  useEffect(() => {
    if (show && currentRx && currentRx.recommendations) {
        const { design, material, coating } = currentRx.recommendations;
        
        // Solo sobrescribimos si hay datos reales en la recomendación
        if (design || material || coating) {
            setFilters(prev => ({
                ...prev,
                design: design || prev.design || "",
                material: material || prev.material || "",
                treatment: coating || prev.treatment || "" 
            }));
        }
    }
  }, [show, currentRx]); 

  // 2. GENERACIÓN DE FILTROS
  const filterOptions = useMemo(() => {
    if (!normalizedCatalog.length) return { designs: [], materials: [], treatments: [] };
    
    const designs = new Set();
    normalizedCatalog.forEach(l => { if (l.design) designs.add(l.design.toString().trim()); });

    const materials = new Set();
    const lensesMatchingDesign = filters.design ? normalizedCatalog.filter(l => l.design === filters.design) : normalizedCatalog;
    lensesMatchingDesign.forEach(l => { if (l.material) materials.add(l.material.toString().trim()); });

    const treatments = new Set();
    const lensesMatchingMat = filters.material ? lensesMatchingDesign.filter(l => l.material === filters.material) : lensesMatchingDesign;
    lensesMatchingMat.forEach(l => { if (l.treatment) treatments.add(l.treatment.toString().trim()); });

    return { designs: Array.from(designs).sort(), materials: Array.from(materials).sort(), treatments: Array.from(treatments).sort() };
  }, [normalizedCatalog, filters.design, filters.material]);

  // 3. MATCHING DE LENTES
  const { validLenses, suggestions, manualFallbackLenses } = useMemo(() => {
    if (!show || (currentRx.od?.sph === undefined || currentRx.od?.sph === null)) return { validLenses: [], suggestions: [], manualFallbackLenses: [] };
    
    let results = normalizedCatalog || [];
    if (filters.design) results = results.filter(l => l.design === filters.design);
    if (filters.material) results = results.filter(l => l.material === filters.material);
    if (filters.treatment) results = results.filter(l => l.treatment === filters.treatment);

    const compatibles = []; 
    const fallbacks = []; 
    const incompatibleReasons = new Set();
    
    results.forEach(lens => {
        const check = checkLensCompatibility(lens, currentRx);
        if (check.compatible) {
            compatibles.push({ ...lens, calculatedCost: check.cost, calculatedPrice: check.price });
        } else {
            incompatibleReasons.add(check.reason);
            if (filters.design || filters.material) fallbacks.push({ ...lens, reason: check.reason });
        }
    });

    compatibles.sort((a,b) => (a.calculatedPrice || 0) - (b.calculatedPrice || 0));
    
    let generatedSuggestions = [];
    if (compatibles.length === 0 && (filters.design || filters.material)) {
        generatedSuggestions = getSuggestions(normalizedCatalog, currentRx, filters);
        if (generatedSuggestions.length === 0 && incompatibleReasons.size > 0) generatedSuggestions.push(`Fuera de rango: ${Array.from(incompatibleReasons)[0]}`);
    }
    return { validLenses: compatibles, suggestions: generatedSuggestions, manualFallbackLenses: fallbacks };
  }, [normalizedCatalog, filters, currentRx, show]);

  const filteredManualLenses = useMemo(() => {
    if (!lensQuery) return [];
    return normalizedCatalog.filter(l => l.name?.toLowerCase().includes(lensQuery.toLowerCase())).slice(0, 5);
  }, [normalizedCatalog, lensQuery]);

  const handleSelectLens = (lens) => {
      setSelectedPreview(lens);
      setManualPriceInput(lens.calculatedPrice || 0);
  };

  const confirmSelection = () => {
      if (!selectedPreview) return;
      
      const finalLens = {
          ...selectedPreview,
          calculatedPrice: Number(manualPriceInput),
          originalPrice: selectedPreview.calculatedPrice 
      };
      
      onAddSmart(finalLens);
      setSelectedPreview(null);
      setManualPriceInput("");
  };

  if (!show) {
      return (
        <Button variant="ghost" onClick={onToggle} className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary">
            + 👓 Agregar Lentes Graduados
        </Button>
      );
  }

  const selectClass = "w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-textMain focus:border-primary outline-none appearance-none cursor-pointer hover:bg-surfaceHighlight transition-colors";

  return (
    <div className="bg-surface/50 border border-primary/20 rounded-xl p-4 mb-6 shadow-sm relative">
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
            {/* SELECT DISEÑO CON RESET MANUAL */}
            <select 
                value={filters.design} 
                onChange={e => setFilters({ 
                    ...filters, 
                    design: e.target.value, 
                    material: "", // 👈 Reset manual al cambiar usuario
                    treatment: "" 
                })} 
                className={selectClass}
            >
                <option value="">Diseño (Todos)</option>
                {filterOptions.designs.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select value={filters.material} onChange={e => setFilters({...filters, material: e.target.value})} className={`${selectClass} ${!filters.design && "opacity-70"}`}>
                <option value="">Material</option>
                {filterOptions.materials.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <select value={filters.treatment} onChange={e => setFilters({...filters, treatment: e.target.value})} className={`${selectClass} ${!filters.material && "opacity-70"}`}>
                <option value="">Tratamiento</option>
                {filterOptions.treatments.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
        </div>

        {/* CONFIRMACIÓN DE PRECIO */}
        {selectedPreview && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary rounded-lg flex justify-between items-center animate-pulse-once">
                <div>
                    <div className="text-sm font-bold text-white">{selectedPreview.name}</div>
                    <div className="text-xs text-primary">Precio Calculado: ${selectedPreview.calculatedPrice}</div>
                    <div className="text-[10px] text-textMuted mt-1">
                        Costo: ${selectedPreview.calculatedCost} · Lab: {selectedPreview.labName}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <label className="text-[10px] text-textMuted uppercase">Precio Final</label>
                        <input 
                            type="number" 
                            value={manualPriceInput} 
                            onChange={e => setManualPriceInput(e.target.value)}
                            className="w-24 bg-surface border border-primary rounded px-2 py-1 text-right text-sm font-bold text-white focus:outline-none"
                        />
                    </div>
                    <div className="flex gap-1">
                        <Button variant="ghost" onClick={() => setSelectedPreview(null)} className="text-xs text-textMuted hover:text-white">Cancelar</Button>
                        <Button onClick={confirmSelection} className="text-xs bg-emerald-500 hover:bg-emerald-600 border-none text-white">
                            + Agregar
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* Lista Resultados */}
        <div className={`max-h-48 overflow-y-auto custom-scrollbar border border-border rounded-lg bg-background mb-4 ${selectedPreview ? 'opacity-50 pointer-events-none' : ''}`}>
            {validLenses.length > 0 ? (
                validLenses.map((l, idx) => (
                    <div 
                        key={`${l.id}-${idx}`} 
                        onClick={() => handleSelectLens(l)} 
                        className="p-3 cursor-pointer border-b border-border last:border-0 hover:bg-surfaceHighlight/50 transition-colors flex justify-between items-center group"
                    >
                        <div>
                            <div className="font-bold text-white text-sm group-hover:text-primary transition-colors">{l.name}</div>
                            <div className="text-xs text-textMuted">{l.labName} · {l.material}</div>
                        </div>
                        <div className="font-bold text-emerald-400 text-sm">${l.calculatedPrice?.toLocaleString()}</div>
                    </div>
                ))
            ) : (
                <div className="p-4 text-center text-xs text-textMuted italic">
                    {suggestions.length > 0 ? (
                         <div className="text-left text-amber-400 space-y-1">{suggestions.map((s, i) => <div key={i}>• {s}</div>)}</div>
                    ) : (
                        manualFallbackLenses.length > 0 ? "Opciones manuales abajo." : "Sin coincidencias exactas."
                    )}
                </div>
            )}
        </div>
        
        {/* Fallbacks y Búsqueda Manual */}
        {manualFallbackLenses.length > 0 && !selectedPreview && (
            <div className="mb-4 border-t border-border pt-2">
                 <div className="text-xs font-bold text-textMuted uppercase mb-2">No compatibles (Agregar Manual):</div>
                 {manualFallbackLenses.map((l, i) => (
                    <div key={i} onClick={() => onAddManual(l)} className="p-2 border border-dashed border-red-900/50 rounded mb-1 cursor-pointer hover:bg-red-900/20 flex justify-between items-center opacity-70 hover:opacity-100">
                        <div className="text-sm text-textMain">{l.name}</div>
                        <div className="text-xs text-red-400">⚠️ {l.reason}</div>
                    </div>
                 ))}
            </div>
        )}
        
        <div className="relative pt-3 border-t border-border border-dashed">
            <input value={lensQuery} onChange={e => setLensQuery(e.target.value)} placeholder="¿No aparece? Busca manualmente..." className="w-full bg-transparent text-sm text-textMuted placeholder-textMuted/50 focus:text-white outline-none" />
             {lensQuery && filteredManualLenses.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-border rounded-lg shadow-xl z-30 overflow-hidden">
                    {filteredManualLenses.map((l, i) => (
                        <div key={i} onClick={() => { onAddManual(l); setLensQuery(""); }} className="p-3 hover:bg-primary/20 cursor-pointer text-sm text-textMain border-b border-border last:border-0">
                            {l.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}