// src/utils/ophthalmologyConfig.js

export const OPHTHALMO_CONFIG = {
  annexes: {
    title: "A. Segmento Anterior: Anexos y Párpados",
    sections: [
      { id: "skin", label: "Piel Palpebral (Lesiones)", type: "text", placeholder: "Lesiones sólidas/líquidas, edema..." },
      { id: "inflammation", label: "Inflamación / Pigmentación", type: "text", placeholder: "Signo, intensidad, zona..." },
      { id: "border", label: "Borde Libre", type: "text", placeholder: "Tylosis, madarosis, triquiasis..." },
      { id: "anterior_border", label: "Borde Anterior (Pestañas)", type: "text" },
      { id: "posterior_border", label: "Borde Posterior / Meibomio", type: "text" },
      { id: "dgm", label: "Clasificación DGM", type: "select", options: ["Grado 0 (Normal)", "Grado 1", "Grado 2", "Grado 3 (Atrofia severa)"] },
      { id: "lacrimal", label: "Vía Lagrimal (Puntos/Papila)", type: "select", options: ["Permeables", "Estenosis", "Eversión", "Ocluidos"] },
      { id: "trophism", label: "Trofismo / Posición", type: "text", placeholder: "Xerosis, Ectropión, Entropión..." }
    ]
  },
  conjunctiva: {
    title: "B. Conjuntiva",
    sections: [
      { id: "tarsal_sup", label: "Tarsal Superior", type: "text", placeholder: "Papilas, folículos, cicatrices..." },
      { id: "tarsal_inf", label: "Tarsal Inferior", type: "text" },
      { id: "nodules", label: "Nódulos", type: "text", placeholder: "Coloración, consistencia..." },
      { id: "bulbar", label: "Bulbar", type: "text", placeholder: "Hiperemia, quemosis, pterigión, secreción..." }
    ]
  },
  cornea: {
    title: "C. Córnea",
    sections: [
      { id: "clarity", label: "Transparencia / Superficie", type: "text", default: "Transparente y brillante" },
      { id: "lesions", label: "Lesiones / Úlceras", type: "text", placeholder: "Infiltrados, dendritas..." },
      { id: "vascularity", label: "Vascularidad / Pannus", type: "text" },
      { id: "endothelium", label: "Endotelio / Guttas", type: "text" },
      { id: "diameter", label: "Diámetro (H/V mm)", type: "text", placeholder: "H: __ / V: __" }
    ]
  },
  chamber: {
    title: "D. Cámara Anterior e Iris",
    sections: [
      { id: "depth", label: "Profundidad (Van Herick)", type: "select", options: ["Grado 4 (Profunda)", "Grado 3", "Grado 2", "Grado 1 (Estrecha)", "Cerrada"] },
      { id: "tyndall", label: "Celularidad (Tyndall)", type: "select", options: ["Negativo", "0.5+", "1+", "2+", "3+", "4+"] },
      { id: "flare", label: "Flare", type: "select", options: ["Negativo", "1+", "2+", "3+", "4+"] },
      { id: "iris", label: "Iris (Color/Patrón)", type: "text", default: "Normocrómico, sin sinequias" },
      { id: "pupil", label: "Pupila", type: "text", default: "Isocórica, Normorreactiva" },
      { id: "reflexes", label: "Reflejos (3/5/7mm)", type: "text", placeholder: "Fotomotor, Consensual..." }
    ]
  },
  diagnostics: {
    title: "E. Pruebas Diagnósticas (PIO / Lágrima)",
    sections: [
      { id: "pio", label: "PIO (mmHg)", type: "number", placeholder: "Valor Schiotz/Goldmann" },
      { id: "tbut", label: "TBUT (seg)", type: "number" },
      { id: "schirmer", label: "Schirmer I (mm)", type: "number" },
      { id: "meniscus", label: "Menisco Lagrimal", type: "select", options: ["Normal", "Bajo", "Alto"] },
      { id: "staining", label: "Tinción Vital (Oxford)", type: "select", options: ["Grado 0", "Grado I", "Grado II", "Grado III", "Grado IV", "Grado V"] }
    ]
  },
  lens: {
    title: "F. Cristalino (LOCS III)",
    sections: [
      { id: "status", label: "Estado", type: "select", options: ["Transparente", "Esclerosis", "Catarata", "Pseudofaquia", "Afaquia"] },
      { id: "locs", label: "Clasificación LOCS III", type: "text", placeholder: "NO__ NC__ C__ P__" },
      { id: "phakic_status", label: "Detalles / Reflejo", type: "text" }
    ]
  },
  gonioscopy: {
    title: "G. Gonioscopía",
    sections: [
      { id: "shaffer", label: "Clasif. Shaffer (Sup/Inf/Nas/Temp)", type: "text", placeholder: "IV / IV / IV / IV" },
      { id: "notes", label: "Hallazgos (Pigmento, Sinequias)", type: "text" }
    ]
  },
  posterior: {
    title: "H. Segmento Posterior (Fondo de Ojo)",
    sections: [
      { id: "vitreous", label: "Vítreo", type: "text", default: "Transparente" },
      { id: "nerve", label: "Papila Óptica", type: "text", placeholder: "Inserción, color, bordes, excavación (0.X)" },
      { id: "macula", label: "Mácula", type: "text", default: "Brillo foveal presente, sin alteraciones" },
      { id: "retina", label: "Retina Central", type: "text", placeholder: "Hemorragias, exudados, drusas..." },
      { id: "vessels", label: "Vasos / Arcadas", type: "text", default: "Calibre y trayecto normal, cruces A/V sanos" },
      { id: "periphery", label: "Retina Periférica", type: "text", default: "Aplicada, sin desgarros ni agujeros" }
    ]
  }
};

export const getOphthalmoDefaults = () => {
  const state = {};
  Object.keys(OPHTHALMO_CONFIG).forEach(key => {
    state[key] = {
      od: {},
      os: {},
      isNormal: true 
    };
    OPHTHALMO_CONFIG[key].sections.forEach(sec => {
      state[key].od[sec.id] = sec.default || "";
      state[key].os[sec.id] = sec.default || "";
    });
  });
  return state;
};

// 👇 NUEVAS CONSTANTES PARA AGUDEZA VISUAL (Híbridas)
export const VA_OPTIONS = [
  "20/10 (200%)",
  "20/15 (133%)",
  "20/20 (100%)",
  "20/25 (80%)",
  "20/30 (66%)",
  "20/40 (50%)",
  "20/50 (40%)",
  "20/60 (33%)",
  "20/70 (28%)",
  "20/80 (25%)",
  "20/100 (20%)",
  "20/150 (13%)",
  "20/200 (10%)",
  "20/300 (6%)",
  "20/400 (5%)",
  "PL (Proyección Luz)",
  "MM (Movimiento Manos)",
  "NPL (No Percibe Luz)"
];

export const VA_NEAR_OPTIONS = [
  "J1 (100%)",
  "J2 (85%)",
  "J3 (70%)",
  "J4 (60%)",
  "J5 (50%)",
  "J6 (40%)",
  "J7", "J8", "J9", "J10", "J12", "J14"
];