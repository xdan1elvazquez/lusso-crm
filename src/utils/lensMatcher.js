import { parseDiopter } from "./rxUtils";

export function checkLensCompatibility(lens, rx) {
  if (!lens.ranges || lens.ranges.length === 0) {
    return { compatible: false, reason: "Sin configuración de rangos", cost: 0, price: 0 };
  }

  // 1. Normalización estricta (Manejo de 0 y nulos)
  const odSph = parseDiopter(rx.od?.sph);
  const odCyl = parseDiopter(rx.od?.cyl);
  const osSph = parseDiopter(rx.os?.sph);
  const osCyl = parseDiopter(rx.os?.cyl);

  // Helper para buscar TODOS los rangos compatibles
  const findCompatibleRanges = (sph, cyl) => {
    // Si el valor es null/undefined (ej. paciente con un solo ojo o datos incompletos), lo saltamos
    if (sph === null || cyl === null) return [];

    return lens.ranges.filter(r => 
      sph >= parseDiopter(r.sphMin) && sph <= parseDiopter(r.sphMax) &&
      cyl >= parseDiopter(r.cylMin) && cyl <= parseDiopter(r.cylMax)
    );
  };

  // 2. Validación por Ojo
  const matchesOD = findCompatibleRanges(odSph, odCyl);
  const matchesOS = findCompatibleRanges(osSph, osCyl);

  // Validación: Si hay datos de RX pero no hay matches, es incompatible.
  // Nota: Si la RX viene vacía (0.00 o null), asumimos que es neutro o balance y buscamos rango 0.
  const hasRxOD = rx.od && (rx.od.sph !== "" || rx.od.cyl !== "");
  const hasRxOS = rx.os && (rx.os.sph !== "" || rx.os.cyl !== "");

  if (hasRxOD && matchesOD.length === 0) {
    return { 
      compatible: false, 
      reason: `OD fuera de rango (Esfera ${odSph}, Cil ${odCyl}).`,
      cost: 0, price: 0
    };
  }

  if (hasRxOS && matchesOS.length === 0) {
    return { 
      compatible: false, 
      reason: `OI fuera de rango (Esfera ${osSph}, Cil ${osCyl}).`,
      cost: 0, price: 0
    };
  }

  // Si no se encontró nada para ningún ojo (ej. rx vacía), retorno seguro
  if (matchesOD.length === 0 && matchesOS.length === 0) {
      return { compatible: false, reason: "Sin graduación válida para evaluar.", cost: 0, price: 0 };
  }

  // 3. Validación de Adición (Progresivos/Bifocales)
  const design = (lens.design || "").toUpperCase();
  const needsAdd = design.includes("PROG") || design.includes("BIFOCAL") || design.includes("OCUPACIONAL");
  
  if (needsAdd) {
    const addVal = parseDiopter(rx.od?.add || rx.os?.add);
    if (addVal <= 0) {
        return { compatible: false, reason: `El diseño ${lens.design} requiere valor de Adición (ADD).`, cost: 0, price: 0 };
    }
  }

  // 4. ESTRATEGIA DE PRECIOS: EL MÁS ALTO GANA
  // Ordenamos Descendente (b - a) por PRECIO para asegurar la venta de mayor valor en caso de overlap
  const sortByHighestPrice = (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0);

  matchesOD.sort(sortByHighestPrice);
  matchesOS.sort(sortByHighestPrice);

  // Tomamos el mejor candidato de cada ojo (o un objeto dummy con precio 0 si no aplica ese ojo)
  const bestRangeOD = matchesOD.length > 0 ? matchesOD[0] : { cost: 0, price: 0 };
  const bestRangeOS = matchesOS.length > 0 ? matchesOS[0] : { cost: 0, price: 0 };

  // 🟢 LÓGICA ANISOMETROPÍA:
  // Tomamos el costo y precio MÁXIMO entre los dos ojos.
  // Si OD cae en rango de $500 y OI en rango de $1200, el par cuesta $1200.
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

// 1. Normalización profunda de un lente
export function normalizeLensData(rawLens) {
    if (!rawLens) return rawLens;
    
    const get = (obj, keyName) => {
        if (!obj) return undefined;
        const key = Object.keys(obj).find(k => k.toLowerCase() === keyName.toLowerCase());
        return key ? obj[key] : undefined;
    };

    const normalized = { ...rawLens }; 

    if (get(rawLens, 'design')) normalized.design = get(rawLens, 'design');
    if (get(rawLens, 'material')) normalized.material = get(rawLens, 'material');
    if (get(rawLens, 'treatment')) normalized.treatment = get(rawLens, 'treatment');
    if (get(rawLens, 'coating')) normalized.treatment = get(rawLens, 'coating');
    if (get(rawLens, 'name')) normalized.name = get(rawLens, 'name');
    if (get(rawLens, 'labname')) normalized.labName = get(rawLens, 'labname'); 

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

// 2. Extraer opciones únicas del catálogo
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