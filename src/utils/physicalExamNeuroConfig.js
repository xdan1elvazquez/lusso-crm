// src/utils/physicalExamNeuroConfig.js

export const PE_NEURO_CONFIG = {
  cranial: {
    title: "A. Nervios Craneales",
    items: [
      { id: "cn1", label: "I. Olfatorio (Identifica olores)", type: "toggle", default: true, invert: true }, // true = normal
      { id: "cn2", label: "II. Óptico (Ver Agudeza/Fondo)", type: "note", text: "Evaluar en Sección Oftalmo/Regional" },
      { id: "cn346", label: "III, IV, VI. Oculomotores", type: "note", text: "Evaluar en Motilidad/Pupilas" },
      { id: "cn5", label: "V. Trigémino (Sensitivo/Motor)", type: "toggle", default: true, invert: true },
      { id: "cn7", label: "VII. Facial (Simetría/Gesticulación)", type: "toggle", default: true, invert: true },
      { id: "cn8", label: "VIII. Vestibulococlear (Audición/Eq)", type: "toggle", default: true, invert: true },
      { id: "cn910", label: "IX-X. Glosofaríngeo/Vago (Deglución/Uvula)", type: "toggle", default: true, invert: true },
      { id: "cn11", label: "XI. Espinal (Fuerza Trapecio/ECM)", type: "toggle", default: true, invert: true },
      { id: "cn12", label: "XII. Hipogloso (Lengua central)", type: "toggle", default: true, invert: true }
    ]
  },
  motor: {
    title: "B. Sistema Motor",
    items: [
      { id: "trofismo", label: "Trofismo Muscular", type: "select", options: ["Conservado", "Hipertrofia", "Atrofia"], default: "Conservado" },
      { id: "tono", label: "Tono Muscular", type: "select", options: ["Normal", "Hipertonía", "Hipotonía", "Rigidez"], default: "Normal" },
      { id: "fuerza", label: "Fuerza Muscular (Daniels)", type: "select", options: ["5/5 Global", "4/5", "3/5", "2/5", "1/5", "0/5"], default: "5/5 Global" },
      { id: "involuntarios", label: "Movimientos Involuntarios", type: "toggle", default: false } // false = no tiene (normal)
    ]
  },
  sensory: {
    title: "C. Sensibilidad",
    items: [
      { id: "superficial", label: "Sensibilidad Superficial (Tacto/Dolor)", type: "select", options: ["Conservada", "Hipoestesia", "Hiperestesia", "Anestesia"], default: "Conservada" },
      { id: "profunda", label: "Sensibilidad Profunda (Propiocepción)", type: "select", options: ["Conservada", "Alterada"], default: "Conservada" }
    ]
  },
  reflexes: {
    title: "D. Reflejos",
    items: [
      { id: "osteotendinosos", label: "Reflejos Osteotendinosos", type: "select", options: ["Normorreflexia (++", "Arreflexia (0)", "Hiporreflexia (+)", "Hiperreflexia (+++)", "Clonus (++++)"], default: "Normorreflexia (++" },
      { id: "superficiales", label: "Reflejos Cutáneos/Superficiales", type: "text", default: "Presentes" }
    ]
  },
  coord: {
    title: "E. Coordinación y Cerebelo",
    items: [
      { id: "metria", label: "Pruebas Métricas (Dedo-Nariz)", type: "text", default: "Eumetría" },
      { id: "diadococinesia", label: "Diadococinesia", type: "text", default: "Conservada" }
    ]
  },
  gait: {
    title: "F. Marcha y Equilibrio",
    items: [
      { id: "marcha", label: "Tipo de Marcha", type: "text", default: "Normal / Eubásica" },
      { id: "romberg", label: "Signo de Romberg", type: "select", options: ["Negativo", "Positivo"], default: "Negativo" },
      { id: "tandem", label: "Marcha en Tándem", type: "select", options: ["Posible", "Imposible/Dificultosa"], default: "Posible" }
    ]
  },
  special: {
    title: "G. Otras Pruebas (Mental/Dolor)",
    items: [
      { id: "cam", label: "CAM (Confusion Assessment Method)", type: "select", options: ["Negativo (Sin Delirium)", "Positivo"], default: "Negativo (Sin Delirium)" },
      { id: "painad", label: "Escala PAINAD (Dolor en Demencia)", type: "text", placeholder: "Puntaje / Descripción" }
    ]
  },
  abdominal: {
    title: "H. Signos Abdominales",
    items: [
      { id: "blumberg", label: "Blumberg (Rebote)", type: "toggle", default: false },
      { id: "murphy", label: "Murphy (Vesicular)", type: "toggle", default: false },
      { id: "mcburney", label: "McBurney (Apendicular)", type: "toggle", default: false },
      { id: "rovsing", label: "Rovsing", type: "toggle", default: false },
      { id: "psoas", label: "Psoas", type: "toggle", default: false },
      { id: "obturador", label: "Obturador", type: "toggle", default: false },
      { id: "gordon", label: "Gordon", type: "toggle", default: false }
    ]
  },
  nutri: {
    title: "I. Exploración Nutricional (Avanzada)",
    items: [
      { id: "perimetros", label: "Perímetros (Cintura/Cadera)", type: "text", placeholder: "cm" },
      { id: "detalles", label: "Notas Nutricionales (DEXA, etc)", type: "textarea" }
    ]
  }
};

export const getNeuroDefaults = () => {
  const defaults = {};
  Object.keys(PE_NEURO_CONFIG).forEach(sectionKey => {
    defaults[sectionKey] = {};
    PE_NEURO_CONFIG[sectionKey].items.forEach(item => {
      if (item.type !== "note") {
        defaults[sectionKey][item.id] = item.default !== undefined ? item.default : "";
      }
    });
    // Campo libre para detalles por sección
    defaults[sectionKey].notas = "";
  });
  return defaults;
};