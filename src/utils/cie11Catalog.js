// src/utils/cie11Catalog.js

// Catálogo resumido del Capítulo 09 CIE-11: Enfermedades del sistema visual
// Total aproximado de códigos hoja en el estándar: ~615
// Esta lista incluye los bloques principales y diagnósticos más comunes.

export const CIE11_OFTALMO = [
  // --- 9A00-9A4Z: PÁRPADOS Y ÓRBITA ---
  { code: "9A00", name: "Trastornos del párpado o de la zona periocular (General)" },
  { code: "9A01", name: "Blefaritis o trastornos infecciosos del párpado" },
  { code: "9A02", name: "Chalazión y otros trastornos inflamatorios profundos" },
  { code: "9A03", name: "Entropión o triquiasis (Posición anómala)" },
  { code: "9A04", name: "Ectropión" },
  { code: "9A05", name: "Ptosis del párpado" },
  { code: "9A06", name: "Lagooftalmos" },
  
  // --- 9A20-9A2Z: APARATO LAGRIMAL ---
  { code: "9A20", name: "Dacrioadenitis (Inflamación glándula lagrimal)" },
  { code: "9A21", name: "Epífora o anomalías del drenaje lagrimal" },
  { code: "9A22", name: "Dacriocistitis (Inflamación conducto)" },

  // --- 9A60-9A9Z: CONJUNTIVA ---
  { code: "9A60", name: "Conjuntivitis infecciosa" },
  { code: "9A61", name: "Conjuntivitis alérgica o inmunitaria" },
  { code: "9A62", name: "Pterigión" },
  { code: "9A63", name: "Pinguecula" },
  { code: "9A64", name: "Hemorragia subconjuntival" },
  { code: "9A65", name: "Cicatrización conjuntival (Simbléfaron)" },

  // --- 9A80-9B0Z: CÓRNEA ---
  { code: "9A80", name: "Queratitis (Úlcera corneal)" },
  { code: "9A81", name: "Queratoconjuntivitis" },
  { code: "9A82", name: "Distrofias corneales (Hereditarias)" },
  { code: "9A83", name: "Queratocono o ectasias corneales" },
  { code: "9A84", name: "Edema corneal (Queratopatía bullosa)" },
  { code: "9A85", name: "Opacidades o cicatrices corneales" },
  { code: "9A86", name: "Neovascularización corneal" },

  // --- 9B10-9B2Z: CRISTALINO (CATARATAS) ---
  { code: "9B10", name: "Catarata senil / relacionada con la edad" },
  { code: "9B10.0", name: "Catarata nuclear" },
  { code: "9B10.1", name: "Catarata cortical" },
  { code: "9B10.2", name: "Catarata subcapsular" },
  { code: "9B11", name: "Catarata traumática" },
  { code: "9B12", name: "Catarata complicada o secundaria" },
  { code: "9B13", name: "Afaquia o luxación del cristalino" },
  
  // --- 9B50-9B9Z: RETINA Y VÍTREO ---
  { code: "9B50", name: "Retinopatía diabética" },
  { code: "9B51", name: "Retinopatía hipertensiva" },
  { code: "9B52", name: "Degeneración macular (DMAE)" },
  { code: "9B53", name: "Oclusión vascular de la retina" },
  { code: "9B54", name: "Desprendimiento de retina" },
  { code: "9B55", name: "Desgarro o agujero retiniano" },
  { code: "9B56", name: "Retinopatía de la prematuridad" },
  { code: "9B70", name: "Desprendimiento del vítreo" },
  { code: "9B71", name: "Hemorragia vítrea" },
  { code: "9B72", name: "Miodesopsias (Opacidades vítreas)" },

  // --- 9C60-9C6Z: GLAUCOMA ---
  { code: "9C60", name: "Sospecha de glaucoma / Hipertensión ocular" },
  { code: "9C61", name: "Glaucoma primario de ángulo abierto" },
  { code: "9C62", name: "Glaucoma primario de ángulo cerrado" },
  { code: "9C63", name: "Glaucoma secundario" },
  { code: "9C64", name: "Glaucoma congénito" },

  // --- 9C80-9C8Z: ESTRABISMO Y MOTILIDAD ---
  { code: "9C80", name: "Estrabismo manifiesto (Tropía)" },
  { code: "9C81", name: "Estrabismo latente (Foria)" },
  { code: "9C82", name: "Nistagmo" },
  { code: "9C83", name: "Parálisis de músculos oculares" },

  // --- 9D00-9D0Z: REFRACCIÓN (LO MÁS COMÚN) ---
  { code: "9D00", name: "Trastornos de la refracción (General)" },
  { code: "9D00.0", name: "Hipermetropía" },
  { code: "9D00.1", name: "Miopía" },
  { code: "9D00.2", name: "Astigmatismo" },
  { code: "9D00.3", name: "Anisometropía" },
  { code: "9D00.4", name: "Presbicia" },
  { code: "9D01", name: "Trastornos de la acomodación" },
  
  // --- 9D40-9D9Z: DISCAPACIDAD VISUAL ---
  { code: "9D90", name: "Deterioro de la visión (Baja visión / Ceguera)" },
  { code: "9D44", name: "Ceguera cromática (Daltonismo)" },
  { code: "9D46", name: "Ceguera nocturna (Nictalopía)" },

  // --- 9C40-9C4Z: NEURO-OFTALMOLOGÍA ---
  { code: "9C40", name: "Trastornos del nervio óptico (Neuritis, Atrofia)" },
  { code: "9C41", name: "Edema de papila" },

  // --- OTROS CÓDIGOS DE INTERÉS ---
  { code: "MC10", name: "Dolor ocular (Síntoma)" },
  { code: "MC11", name: "Ojo rojo (Síntoma)" },
  { code: "QA00", name: "Examen de ojos y visión (Consulta de rutina)" }
];

export function searchDiagnosis(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  
  return CIE11_OFTALMO.filter(d => 
    d.code.toLowerCase().includes(q) || 
    d.name.toLowerCase().includes(q)
  ).slice(0, 20); // Limitar resultados para UI fluida
}