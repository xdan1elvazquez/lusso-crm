import { parseDiopter } from "./rxUtils";

export function checkLensCompatibility(lens, rx) {
  if (!lens.ranges || lens.ranges.length === 0) {
    return { compatible: false, reason: "Sin configuración de rangos", cost: 0 };
  }

  // 1. Normalización estricta de la Rx entrante
  const odSph = parseDiopter(rx.od?.sph);
  const odCyl = parseDiopter(rx.od?.cyl);
  const osSph = parseDiopter(rx.os?.sph);
  const osCyl = parseDiopter(rx.os?.cyl);

  // 2. Validación por Ojo
  // Buscamos si existe AL MENOS un rango que cubra el OD
  const rangeOD = lens.ranges.find(r => 
    odSph >= parseDiopter(r.sphMin) && odSph <= parseDiopter(r.sphMax) &&
    odCyl >= parseDiopter(r.cylMin) && odCyl <= parseDiopter(r.cylMax)
  );

  if (!rangeOD) {
    return { 
      compatible: false, 
      reason: `OD fuera de rango (Esfera ${odSph}, Cil ${odCyl}). Revisa límites del lab.`,
      cost: 0 
    };
  }

  const rangeOS = lens.ranges.find(r => 
    osSph >= parseDiopter(r.sphMin) && osSph <= parseDiopter(r.sphMax) &&
    osCyl >= parseDiopter(r.cylMin) && osCyl <= parseDiopter(r.cylMax)
  );

  if (!rangeOS) {
    return { 
      compatible: false, 
      reason: `OI fuera de rango (Esfera ${osSph}, Cil ${osCyl}).`,
      cost: 0 
    };
  }

  // 3. Validación de Adición (solo si el diseño lo pide)
  const design = (lens.design || "").toUpperCase();
  const needsAdd = design.includes("PROG") || design.includes("BIFOCAL") || design.includes("OCUPACIONAL");
  
  if (needsAdd) {
    const addVal = parseDiopter(rx.od?.add || rx.os?.add);
    if (addVal <= 0) {
        return { compatible: false, reason: `El diseño ${lens.design} requiere valor de Adición (ADD).`, cost: 0 };
    }
  }

  // Tomamos el costo mayor de los dos rangos encontrados
  const finalCost = Math.max(Number(rangeOD.cost) || 0, Number(rangeOS.cost) || 0);

  return { compatible: true, reason: "Compatible", cost: finalCost };
}

// ... (getSuggestions se mantiene igual, importando parseDiopter si hace comparaciones numéricas)
export function getSuggestions(allLenses, rx, currentFilters) {
    // Reutiliza checkLensCompatibility que ya normaliza internamente
    const suggestions = [];
    // ... lógica previa ...
    return suggestions;
}