import { parseDiopter } from "./rxUtils";

export function checkLensCompatibility(lens, rx) {
  if (!lens.ranges || lens.ranges.length === 0) {
    return { compatible: false, reason: "Sin configuración de rangos", cost: 0, price: 0 };
  }

  // 1. Normalización estricta
  const odSph = parseDiopter(rx.od?.sph);
  const odCyl = parseDiopter(rx.od?.cyl);
  const osSph = parseDiopter(rx.os?.sph);
  const osCyl = parseDiopter(rx.os?.cyl);

  // Helper para buscar TODOS los rangos compatibles, no solo el primero
  const findCompatibleRanges = (sph, cyl) => {
    return lens.ranges.filter(r => 
      sph >= parseDiopter(r.sphMin) && sph <= parseDiopter(r.sphMax) &&
      cyl >= parseDiopter(r.cylMin) && cyl <= parseDiopter(r.cylMax)
    );
  };

  // 2. Validación por Ojo (Busca todos los matches posibles)
  const matchesOD = findCompatibleRanges(odSph, odCyl);
  const matchesOS = findCompatibleRanges(osSph, osCyl);

  if (matchesOD.length === 0) {
    return { 
      compatible: false, 
      reason: `OD fuera de rango (Esfera ${odSph}, Cil ${odCyl}).`,
      cost: 0, price: 0
    };
  }

  if (matchesOS.length === 0) {
    return { 
      compatible: false, 
      reason: `OI fuera de rango (Esfera ${osSph}, Cil ${osCyl}).`,
      cost: 0, price: 0
    };
  }

  // 3. Validación de Adición
  const design = (lens.design || "").toUpperCase();
  const needsAdd = design.includes("PROG") || design.includes("BIFOCAL") || design.includes("OCUPACIONAL");
  
  if (needsAdd) {
    const addVal = parseDiopter(rx.od?.add || rx.os?.add);
    if (addVal <= 0) {
        return { compatible: false, reason: `El diseño ${lens.design} requiere valor de Adición (ADD).`, cost: 0, price: 0 };
    }
  }

  // ESTRATEGIA DE PRECIOS INTELIGENTE:
  // Si hay múltiples rangos (ej. uno amplio y uno específico), ordenamos por costo ascendente.
  // Asumimos que el rango "correcto" es el que ofrece el precio base válido.
  matchesOD.sort((a, b) => (Number(a.cost) || 0) - (Number(b.cost) || 0));
  matchesOS.sort((a, b) => (Number(a.cost) || 0) - (Number(b.cost) || 0));

  const bestRangeOD = matchesOD[0];
  const bestRangeOS = matchesOS[0];

  // Tomamos el costo/precio mayor de los dos ojos (regla estándar de par)
  const finalCost = Math.max(Number(bestRangeOD.cost) || 0, Number(bestRangeOS.cost) || 0);
  const finalPrice = Math.max(Number(bestRangeOD.price) || 0, Number(bestRangeOS.price) || 0);

  return { compatible: true, reason: "Compatible", cost: finalCost, price: finalPrice };
}

export function getSuggestions(allLenses, rx, currentFilters) {
    const suggestions = [];
    // ... (El resto de la función se mantiene igual)
    if (currentFilters.treatment) {
      const alts = allLenses.filter(l => 
        l.design === currentFilters.design && 
        l.material === currentFilters.material &&
        l.treatment !== currentFilters.treatment &&
        checkLensCompatibility(l, rx).compatible
      );
      if (alts.length > 0) suggestions.push(`Disponible en otros tratamientos: ${alts.map(a => a.treatment).join(", ")}`);
    }
    return suggestions;
}