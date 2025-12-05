// src/utils/anamnesisConfig.js

export const PATHOLOGICAL_CONFIG = [
  {
    id: "development",
    title: "Enfermedades del Desarrollo y Nacimiento",
    items: [
      { id: "birth_compl", label: "Complicaciones del Nacimiento" },
      { id: "development_delay", label: "Retraso en el Desarrollo" },
      { id: "childhood_dis", label: "Enfermedades de la Infancia" },
      { id: "adolescence_dis", label: "Enfermedades de la Adolescencia" }
    ]
  },
  {
    id: "chronic",
    title: "Crónico-Degenerativas",
    items: [
      { id: "diabetes", label: "Diabetes Mellitus", isSpecial: true, type: "DIABETES" },
      { id: "has", label: "Hipertensión Arterial (HAS)", isSpecial: true, type: "HAS" },
      { id: "dislipidemia", label: "Dislipidemias (Colesterol/Triglicéridos)" },
      { id: "cardiac", label: "Enfermedades Cardíacas" },
      { id: "obesity", label: "Obesidad" }
    ]
  },
  {
    id: "endocrine",
    title: "Endocrinológicas",
    items: [
      { id: "thyroid", label: "Enfermedades de la Tiroides" },
      { id: "metabolic", label: "Otros Trastornos Metabólicos" }
    ]
  },
  {
    id: "systems_1",
    title: "Gastro, Reuma, Óseo, Resp",
    items: [
      { id: "gastro", label: "Enfermedades Gastrointestinales" },
      { id: "vascular", label: "Várices / Circulación Periférica" },
      { id: "bone", label: "Enfermedades Óseas / Osteoporosis" },
      { id: "rheuma", label: "Enfermedades Reumatológicas" },
      { id: "respiratory", label: "Enfermedades Respiratorias (Asma/EPOC)" },
      { id: "dental", label: "Enfermedades Odontológicas" }
    ]
  },
  {
    id: "neuro_sensory",
    title: "Neurológicas y Sensoriales",
    items: [
      { id: "migraine", label: "Migrañas" },
      { id: "facial_palsy", label: "Parálisis Facial" },
      { id: "neuro_other", label: "Otras Neurológicas (Epilepsia, etc.)" },
      { id: "hearing", label: "Enfermedades Auditivas" }
    ]
  },
  {
    id: "infectious_skin",
    title: "Dermatológicas e Infecciosas",
    items: [
      { id: "skin", label: "Enfermedades Dermatológicas" },
      { id: "viral", label: "Infecciones Virales Relevantes" },
      { id: "psych", label: "Enfermedades Psiquiátricas" }
    ]
  },
  {
    id: "obgyn",
    title: "Ginecológicos y Obstétricos",
    items: [
      { id: "pregnancy_htn", label: "Trastornos Hipertensivos del Embarazo" },
      { id: "pcos", label: "SOP / Hormonal" },
      { id: "menopause", label: "Menopausia / Climaterio" }
    ]
  },
  {
    id: "diverse",
    title: "Varios (Alergias, Qx, Trauma)",
    items: [
      { id: "allergies", label: "Alergias" },
      { id: "meds_history", label: "Uso Crónico de Medicamentos / Reacciones" },
      { id: "environment", label: "Exposición Medioambiental" },
      { id: "trauma", label: "Traumatismos Relevantes" },
      { id: "surgery", label: "Cirugías Relevantes" }
    ]
  }
];

// Listas simples para las otras secciones (compatibilidad)
export const NON_PATHOLOGICAL_LIST = ["Tabaquismo", "Alcoholismo", "Toxicomanías", "Alimentación", "Actividad Física", "Inmunizaciones"];
export const OCULAR_LIST = ["Glaucoma", "Catarata", "Cirugía Ocular", "Trauma Ocular", "Uso de Lentes de Contacto", "Ojo Seco", "Infecciones Recurrentes", "Desprendimiento Retina", "Queratocono"];
export const FAMILY_LIST = ["Diabetes", "Hipertensión", "Glaucoma", "Ceguera", "Catarata", "Cáncer", "Cardiopatía"];

// Mapa de migración: Nombre Viejo -> ID Nuevo
export const LEGACY_MAPPING = {
  "Diabetes": "diabetes",
  "Hipertensión": "has",
  "Artritis": "rheuma",
  "Tiroides": "thyroid",
  "Cáncer": "chronic", // Genérico si no hay específico
  "Enf. Autoinmune": "rheuma",
  "Renal": "chronic",
  "Cardiovascular": "cardiac",
  "Embarazo": "pregnancy_htn" // Aproximación
};