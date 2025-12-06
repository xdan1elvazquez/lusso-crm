// src/utils/ipasNervousVisualConfig.js

export const MUNK_SCALE = ["0", "1", "2", "3", "4"];
export const INTENSITY_SCALE = ["Leve", "Moderado", "Severo", "1/10", "2/10", "3/10", "4/10", "5/10", "6/10", "7/10", "8/10", "9/10", "10/10"];
export const ZONES = ["OD", "OI", "Ambos", "Frontal", "Occipital", "Temporal", "Global"];

export const IPAS_NV_CONFIG = {
  nervous: {
    id: "nervous",
    title: "1. Sistema Nervioso",
    symptoms: [
      { id: "cefalea", label: "Cefalea" },
      { id: "mareos", label: "Mareos" },
      { id: "irse_lado", label: "Sensación de irse de lado" }
    ]
  },
  vision: {
    id: "vision",
    title: "2. Órganos de los Sentidos: Vista",
    symptoms: [
      { id: "oftalgia", label: "Oftalgia (Dolor)" },
      { id: "punzadas", label: "Punzadas" },
      { id: "leganas", label: "Legañas", special: "LEGANAS" },
      { id: "epifora", label: "Epífora", special: "MUNK" },
      { id: "pseudoepifora", label: "Pseudoepífora", special: "MUNK" },
      { id: "hiperemia", label: "Hiperemia" },
      { id: "hemorragias", label: "Hemorragias" },
      { id: "ictericia", label: "Ictericia" },
      { id: "prurito", label: "Prurito" },
      { id: "ardor", label: "Ardor" },
      { id: "fotofobia_nat", label: "Fotofobia (Luz Natural)" },
      { id: "fotofobia_art", label: "Fotofobia (Luz Artificial)" },
      { id: "arenoso", label: "Sensación Arenosa" },
      { id: "ojo_seco", label: "Ojo Seco" }
    ]
  },
  forms: {
    id: "forms",
    title: "3. Fenómenos Visuales: Percepción y Formas",
    symptoms: [
      { id: "aberracion", label: "Aberración óptica" },
      { id: "nublado", label: "Ve nublado" },
      { id: "diplopia", label: "Diplopía" },
      { id: "miodesopsias", label: "Miodesopsias entópticas" },
      { id: "escotomas", label: "Escotomas", special: "ESCOTOMAS" },
      { id: "metamorfopsia", label: "Metamorfopsia" },
      { id: "micropsia", label: "Micropsia" },
      { id: "macropsia", label: "Macropsia" },
      { id: "hemianopsia", label: "Hemianopsia" },
      { id: "cuadranopsia", label: "Cuadranopsia" },
      { id: "oscilopsia", label: "Oscilopsia" }
    ]
  },
  light: {
    id: "light",
    title: "4. Fenómenos Visuales: Luz",
    symptoms: [
      { id: "fotopsias", label: "Fotopsias" },
      { id: "fosfenos", label: "Fosfenos" },
      { id: "halos", label: "Halos" },
      { id: "glare", label: "Glare (Deslumbramiento)" }
    ]
  },
  color: {
    id: "color",
    title: "5. Fenómenos Visuales: Color",
    symptoms: [
      { id: "protanopia", label: "Protanopia" },
      { id: "deuteranopia", label: "Deuteranopia" },
      { id: "tritanopia", label: "Tritanopia" },
      { id: "cianopsia", label: "Cianopsia" },
      { id: "xantopsia", label: "Xantopsia" },
      { id: "eritropsia", label: "Eritropsia" }
    ]
  }
};