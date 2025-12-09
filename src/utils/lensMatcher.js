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
  matchesOD.sort((a, b) => (Number(a.cost) || 0) - (Number(b.cost) || 0));
  matchesOS.sort((a, b) => (Number(a.cost) || 0) - (Number(b.cost) || 0));

  const bestRangeOD = matchesOD[0];
  const bestRangeOS = matchesOS[0];

  const finalCost = Math.max(Number(bestRangeOD.cost) || 0, Number(bestRangeOS.cost) || 0);
  const finalPrice = Math.max(Number(bestRangeOD.price) || 0, Number(bestRangeOS.price) || 0);

  return { compatible: true, reason: "Compatible", cost: finalCost, price: finalPrice };
}

export function getSuggestions(allLenses, rx, currentFilters) {
    const suggestions = [];
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

// --- NUEVAS FUNCIONES PARA CENTRALIZAR LÓGICA (Recomendación Estructurada) ---

// 1. Normalización profunda de un lente (limpia mayúsculas/minúsculas)
export function normalizeLensData(rawLens) {
    if (!rawLens) return rawLens;
    
    // Función para buscar valor ignorando mayúsculas en las llaves
    const get = (obj, keyName) => {
        if (!obj) return undefined;
        const key = Object.keys(obj).find(k => k.toLowerCase() === keyName.toLowerCase());
        return key ? obj[key] : undefined;
    };

    // Construimos un objeto limpio estándar
    const normalized = { ...rawLens }; 

    // Propiedades raíz críticas normalizadas
    if (get(rawLens, 'design')) normalized.design = get(rawLens, 'design');
    if (get(rawLens, 'material')) normalized.material = get(rawLens, 'material');
    if (get(rawLens, 'treatment')) normalized.treatment = get(rawLens, 'treatment');
    // Mapeamos 'coating' a 'treatment' si es necesario para compatibilidad
    if (get(rawLens, 'coating')) normalized.treatment = get(rawLens, 'coating');
    if (get(rawLens, 'name')) normalized.name = get(rawLens, 'name');
    if (get(rawLens, 'labname')) normalized.labName = get(rawLens, 'labname'); 

    // Normalizar Rangos (CRÍTICO para el precio/compatibilidad)
    const rawRanges = get(rawLens, 'ranges');
    if (Array.isArray(rawRanges)) {
        normalized.ranges = rawRanges.map(r => ({
            ...r,
            sphMin: get(r, 'sphmin'),
            sphMax: get(r, 'sphmax'),
            cylMin: get(r, 'cylmin'),
            cylMax: get(r, 'cylmax'),
            cost: get(r, 'cost'),
            price: get(r, 'price')
        }));
    }

    return normalized;
}

// 2. Extraer opciones únicas del catálogo (para llenar los Selects)
export function getCatalogOptions(catalog) {
    if (!Array.isArray(catalog)) return { designs: [], materials: [], treatments: [] };
    
    const designs = new Set();
    const materials = new Set();
    const treatments = new Set();

    catalog.forEach(rawLens => {
        const lens = normalizeLensData(rawLens);
        if (lens.design) designs.add(lens.design.toString().trim());
        if (lens.material) materials.add(lens.material.toString().trim());
        if (lens.treatment) treatments.add(lens.treatment.toString().trim());
    });

    return {
        designs: Array.from(designs).sort(),
        materials: Array.from(materials).sort(),
        treatments: Array.from(treatments).sort()
    };
}