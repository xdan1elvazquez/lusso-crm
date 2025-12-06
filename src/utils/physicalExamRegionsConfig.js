// src/utils/physicalExamRegionsConfig.js

export const PE_REGIONS_CONFIG = {
  head: {
    id: "head",
    title: "1. Cabeza",
    items: [
      { id: "normocefalo", label: "Normocéfalo", type: "toggle", invert: true, default: true },
      { id: "simetria", label: "Simetría", type: "toggle", invert: true, default: true },
      { id: "lesiones", label: "Lesiones / Masas", type: "toggle", default: false },
      { id: "depresiones", label: "Depresiones", type: "toggle", default: false },
      { id: "detalles", label: "Detalles", type: "text" }
    ]
  },
  eyes: {
    id: "eyes",
    title: "2. Ojos (Exploración General)",
    items: [
      { id: "anexos", label: "Anexos íntegros", type: "toggle", invert: true, default: true },
      { id: "conjuntivas", label: "Conjuntivas", type: "text", default: "Rosadas" },
      { id: "escleras", label: "Escleras", type: "text", default: "Blancas" },
      { id: "corneas", label: "Córneas", type: "text", default: "Claras" },
      { id: "pupilas", label: "Pupilas", type: "select", options: ["Isocóricas Normorreactivas", "Anisocoria", "Miosis", "Midriasis"], default: "Isocóricas Normorreactivas" },
      { id: "movimientos", label: "Movimientos", type: "select", options: ["Completos", "Limitados"], default: "Completos" }
    ]
  },
  ears: {
    id: "ears",
    title: "3. Oídos",
    items: [
      { id: "pabellon", label: "Pabellón", type: "text", default: "Normoimplantado" },
      { id: "cae", label: "CAE", type: "text", default: "Permeable" },
      { id: "timpano", label: "Tímpano", type: "text", default: "Íntegro/Nacarado" },
      { id: "otorrea", label: "Otorrea", type: "toggle", default: false }
    ]
  },
  nose: {
    id: "nose",
    title: "4. Nariz y Senos",
    items: [
      { id: "mucosa", label: "Mucosa", type: "text", default: "Húmeda" },
      { id: "cornetes", label: "Cornetes", type: "text", default: "Eutróficos" },
      { id: "tabique", label: "Tabique", type: "text", default: "Centrado" },
      { id: "rinorrea", label: "Rinorrea", type: "toggle", default: false },
      { id: "dolor_sinusal", label: "Dolor Sinusal", type: "toggle", default: false }
    ]
  },
  mouth: {
    id: "mouth",
    title: "5. Boca y Faringe",
    items: [
      { id: "mucosa_oral", label: "Mucosa Oral", type: "text", default: "Húmeda" },
      { id: "denticion", label: "Dentición", type: "text", default: "Conservada" },
      { id: "faringe", label: "Faringe", type: "text", default: "Normémica" },
      { id: "amigdalas", label: "Amígdalas", type: "select", options: ["Grado 0", "Grado 1", "Grado 2", "Grado 3", "Grado 4"], default: "Grado 1" },
      { id: "exudados", label: "Exudados/Lesiones", type: "toggle", default: false }
    ]
  },
  neck: {
    id: "neck",
    title: "6. Cuello",
    items: [
      { id: "movilidad", label: "Movilidad", type: "text", default: "Conservada" },
      { id: "adenomegalias", label: "Adenomegalias", type: "toggle", default: false },
      { id: "pulsos", label: "Pulsos Carotídeos", type: "text", default: "Presentes/Simétricos" },
      { id: "tiroides", label: "Tiroides", type: "text", default: "No palpable" },
      { id: "ingurgitacion", label: "Ingurgitación", type: "toggle", default: false }
    ]
  },
  thorax: {
    id: "thorax",
    title: "7. Tórax",
    items: [
      { id: "forma", label: "Forma", type: "select", options: ["Normolíneo", "Tonel", "Excavatum", "Carinatum"], default: "Normolíneo" },
      { id: "simetria", label: "Simetría", type: "toggle", invert: true, default: true },
      { id: "movimientos", label: "Movimientos Resp.", type: "text", default: "Normales" },
      { id: "dolor_palpacion", label: "Dolor Palpación", type: "toggle", default: false },
      { id: "crepitacion", label: "Crepitación Subcutánea", type: "toggle", default: false }
    ]
  },
  lungs: {
    id: "lungs",
    title: "9. Pulmones",
    items: [
      { id: "murmullo", label: "Murmullo Vesicular", type: "text", default: "Conservado" },
      { id: "estertores", label: "Estertores", type: "toggle", default: false },
      { id: "sibilancias", label: "Sibilancias", type: "toggle", default: false },
      { id: "roncus", label: "Roncus", type: "toggle", default: false },
      { id: "frotes", label: "Frotes", type: "toggle", default: false }
    ]
  },
  heart: {
    id: "heart",
    title: "10. Corazón",
    items: [
      { id: "ruidos", label: "Ruidos", type: "text", default: "Rítmicos buen tono" },
      { id: "soplos", label: "Soplos", type: "toggle", default: false },
      { id: "detalle_soplos", label: "Detalle Soplos", type: "text" }
    ]
  },
  abdomen: {
    id: "abdomen",
    title: "11. Abdomen",
    items: [
      { id: "forma", label: "Forma", type: "text", default: "Plano / Blando" },
      { id: "peristalsis", label: "Peristalsis", type: "text", default: "Normoaudible" },
      { id: "dolor", label: "Dolor Palpación", type: "toggle", default: false },
      { id: "visceromegalias", label: "Visceromegalias", type: "toggle", default: false },
      { id: "irritacion", label: "Irritación Peritoneal", type: "toggle", default: false },
      { id: "masas", label: "Masas", type: "toggle", default: false }
    ]
  },
  genitals: {
    id: "genitals",
    title: "12. Genitales",
    items: [
      { id: "inspeccion", label: "Inspección General", type: "text", default: "Sin alteraciones evidentes" },
      { id: "lesiones", label: "Lesiones", type: "toggle", default: false },
      { id: "secrecion", label: "Secreción", type: "toggle", default: false },
      { id: "tanner", label: "Estadio Tanner", type: "text" }
    ]
  },
  inguinal: {
    id: "inguinal",
    title: "13. Región Inguinal",
    items: [
      { id: "hernias", label: "Hernias", type: "toggle", default: false },
      { id: "adenopatias", label: "Adenopatías", type: "toggle", default: false },
      { id: "dolor", label: "Dolor", type: "toggle", default: false }
    ]
  },
  rectal: {
    id: "rectal",
    title: "14. Ano-recto (Si indicado)",
    items: [
      { id: "evaluado", label: "Se realizó tacto", type: "toggle", default: false },
      { id: "lesiones_externas", label: "Lesiones Externas", type: "toggle", default: false },
      { id: "tono", label: "Tono Esfínter", type: "text", default: "Normal" },
      { id: "hallazgos", label: "Hallazgos Tacto", type: "text" }
    ]
  },
  upperExt: {
    id: "upperExt",
    title: "15. Extremidades Superiores",
    items: [
      { id: "simetria", label: "Simetría", type: "toggle", invert: true, default: true },
      { id: "fuerza", label: "Fuerza (Daniels)", type: "select", options: ["5/5", "4/5", "3/5", "2/5", "1/5"], default: "5/5" },
      { id: "pulsos", label: "Pulsos", type: "text", default: "Presentes/Simétricos" },
      { id: "llenado", label: "Llenado Capilar", type: "text", default: "< 2 seg" },
      { id: "dolor", label: "Dolor", type: "toggle", default: false }
    ]
  },
  lowerExt: {
    id: "lowerExt",
    title: "16. Extremidades Inferiores",
    items: [
      { id: "simetria", label: "Simetría", type: "toggle", invert: true, default: true },
      { id: "fuerza", label: "Fuerza (Daniels)", type: "select", options: ["5/5", "4/5", "3/5", "2/5", "1/5"], default: "5/5" },
      { id: "pulsos", label: "Pulsos (Pedio/Tibial)", type: "text", default: "Presentes" },
      { id: "edema", label: "Edema", type: "toggle", default: false },
      { id: "varices", label: "Insuficiencia Venosa", type: "toggle", default: false }
    ]
  },
  spine: {
    id: "spine",
    title: "17. Columna Vertebral",
    items: [
      { id: "alineacion", label: "Alineación", type: "text", default: "Central" },
      { id: "dolor", label: "Dolor palpación/percusion", type: "toggle", default: false },
      { id: "movilidad", label: "Movilidad Limitada", type: "toggle", default: false },
      { id: "deformidad", label: "Deformidad (Cifosis/Escoliosis)", type: "toggle", default: false }
    ]
  },
  neuro: {
    id: "neuro",
    title: "18. Sistema Neurológico",
    items: [
      { id: "pares", label: "Pares Craneales", type: "text", default: "Sin alteraciones" },
      { id: "sensibilidad", label: "Sensibilidad", type: "text", default: "Conservada" },
      { id: "reflejos", label: "Reflejos Osteotendinosos", type: "text", default: "Normorreflexia" },
      { id: "meningeos", label: "Signos Meníngeos", type: "toggle", default: false }
    ]
  }
};

export const getRegionalExamDefaults = () => {
  const defaults = {};
  Object.keys(PE_REGIONS_CONFIG).forEach(key => {
    defaults[key] = {};
    PE_REGIONS_CONFIG[key].items.forEach(item => {
      defaults[key][item.id] = item.default !== undefined ? item.default : "";
    });
    defaults[key].notas = ""; 
  });
  return defaults;
};