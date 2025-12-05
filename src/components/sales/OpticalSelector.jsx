import React, { useState, useMemo } from "react";
import { checkLensCompatibility, getSuggestions } from "@/utils/lensMatcher";

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
        <button onClick={onToggle} style={{ marginTop: 15, background: "transparent", border: "1px dashed #60a5fa", color: "#60a5fa", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: "0.9em", width: "100%" }}>
            👓 Agregar Lentes Graduados
        </button>
      );
  }

  return (
    <div style={{ background: "#1f1f1f", padding: 10, borderRadius: 8, marginBottom: 15, border:"1px solid #60a5fa" }}>
        <div style={{fontSize:11, color:"#60a5fa", fontWeight:"bold", marginBottom:10}}>SELECTOR DE MICA (Rx Inteligente)</div>
        
        <div style={{display:"flex", gap:15, marginBottom:15, fontSize:12, color:"#ddd", background:"#333", padding:8, borderRadius:4}}>
            <div style={{fontWeight:"bold", color:"#fbbf24"}}>SERVICIOS:</div>
            <label style={{display:"flex", alignItems:"center", gap:5, cursor:"pointer"}}>
                <input type="checkbox" checked={itemDetails.requiresBisel} onChange={e => setItemDetails({...itemDetails, requiresBisel: e.target.checked})} />
                🛠️ Bisel
            </label>
            <label style={{display:"flex", alignItems:"center", gap:5, cursor:"pointer"}}>
                <input type="checkbox" checked={itemDetails.requiresTallado} onChange={e => setItemDetails({...itemDetails, requiresTallado: e.target.checked})} />
                ⚙️ Tallado
            </label>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10}}>
            <select value={filters.design} onChange={e => setFilters({...filters, design: e.target.value})} style={{padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4, fontSize:12}}><option value="">-- Diseño --</option>{filterOptions.designs.map(d => <option key={d} value={d}>{d}</option>)}</select>
            <select value={filters.material} onChange={e => setFilters({...filters, material: e.target.value})} style={{padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4, fontSize:12}}><option value="">-- Material --</option>{filterOptions.materials.map(m => <option key={m} value={m}>{m}</option>)}</select>
            <select value={filters.treatment} onChange={e => setFilters({...filters, treatment: e.target.value})} style={{padding:6, background:"#333", border:"1px solid #555", color:"white", borderRadius:4, fontSize:12}}><option value="">-- Tratamiento --</option>{filterOptions.treatments.map(t => <option key={t} value={t}>{t}</option>)}</select>
        </div>

        <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #333", borderRadius: 4, background: "#111" }}>
            {validLenses.length > 0 ? validLenses.map(l => (
                <div key={l.id} onClick={() => onAddSmart(l)} style={{ padding: 8, cursor: "pointer", borderBottom: "1px solid #222", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div><div style={{fontWeight:"bold", color:"white", fontSize:13}}>{l.name}</div><div style={{fontSize:11, color:"#aaa"}}>{l.labName} · {l.material}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:12, color:"#4ade80", fontWeight:"bold"}}>${l.calculatedPrice?.toLocaleString()}</div></div>
                </div>
            )) : (
                <div style={{ padding: 15, textAlign: "center", fontSize: 13, color: "#888" }}>
                    {suggestions.length > 0 ? <ul style={{textAlign:"left", margin:0, paddingLeft:20, color:"#fbbf24"}}>{suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul> : (currentRx.od.sph !== null ? "Usa filtros para buscar." : "Carga Rx para ver opciones.")}
                </div>
            )}
        </div>
        
        <div style={{marginTop:10, borderTop:"1px dashed #444", paddingTop:8}}>
            <input value={lensQuery} onChange={e => setLensQuery(e.target.value)} placeholder="O busca manualmente..." style={{ width: "100%", padding: 6, background: "#222", color: "#aaa", border: "1px solid #333", borderRadius: 4, fontSize:12 }} />
             {lensQuery && filteredManualLenses.length > 0 && (
                <div style={{ position: "absolute", zIndex: 20, background: "#222", border: "1px solid #444", width: "300px" }}>
                    {filteredManualLenses.map(l => <div key={l.id} onClick={() => { onAddManual(l); setLensQuery(""); }} style={{padding:10, borderBottom:"1px solid #444", cursor:"pointer"}}>{l.name}</div>)}
                </div>
            )}
        </div>

        <div style={{display:"flex", gap:5, marginTop:10}}>
             <input placeholder="Armazón (Marca/Modelo)" value={itemDetails.frameModel} onChange={e => setItemDetails({...itemDetails, frameModel:e.target.value})} style={{flex:1, padding:6, background:"#333", border:"none", color:"white", borderRadius:4, fontSize:12}} />
             <select value={itemDetails.frameStatus} onChange={e => setItemDetails({...itemDetails, frameStatus:e.target.value})} style={{width:80, padding:6, background:"#333", border:"none", color:"#aaa", borderRadius:4, fontSize:11}}><option value="NUEVO">Nuevo</option><option value="USADO">Usado</option><option value="PROPIO">Propio</option></select>
        </div>
    </div>
  );
}