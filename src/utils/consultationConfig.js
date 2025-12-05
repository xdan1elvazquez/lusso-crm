// src/utils/consultationConfig.js

export const SYSTEMS_CONFIG = [
  { id: "endocrine", label: "Endocrino (Diabetes)", options: ["Poliuria", "Polidipsia", "Pérdida de Peso", "Intolerancia al calor/frío"] },
  { id: "cardiovascular", label: "Cardiovascular (HTA)", options: ["Dolor Torácico", "Disnea", "Ortopnea", "Edema", "Palpitaciones"] },
  { id: "respiratory", label: "Respiratorio", options: ["Tos", "Expectoración", "Disnea", "Sibilancias"] },
  { id: "digestive", label: "Digestivo", options: ["Disfagia", "Pirosis", "Dolor Abdominal", "Náusea/Vómito", "Cambios hábito intestinal"] },
  { id: "nervous", label: "Nervioso", options: ["Cefalea", "Mareo", "Pérdida de conciencia", "Alteraciones marcha", "Parestesias"] },
  { id: "musculoskeletal", label: "Musculoesquelético", options: ["Artralgias", "Mialgias", "Rigidez matutina", "Limitación movimiento"] },
  { id: "genitourinary", label: "Genitourinario", options: ["Disuria", "Hematuria", "Polaquiuria", "Incontinencia"] },
  { id: "skin", label: "Piel y Tegumentos", options: ["Rash", "Prurito", "Cambios coloración", "Lesiones"] },
  { id: "psychiatric", label: "Psiquiátrico", options: ["Ansiedad", "Depresión", "Insomnio", "Alteraciones memoria"] },
  { id: "hemolymphatic", label: "Hemolinfático", options: ["Palidez", "Sangrado fácil", "Adenopatías"] }
];

export const getEmptySystems = () => {
    const state = {};
    SYSTEMS_CONFIG.forEach(s => {
        state[s.id] = { isNormal: true, selected: [], details: "" };
    });
    return state;
};

export const QUICK_DATA = {
  symptoms: ["Mala Visión Lejana", "Mala Visión Próxima", "Cefalea", "Ardor", "Lagrimeo", "Comezón", "Dolor Ocular", "Fotofobia", "Ojo Rojo", "Secreción", "Cuerpo Extraño", "Revisión Rutina"],
  anterior: {
    lids: ["Normales", "Blefaritis", "Meibomitis", "Chalazion", "Orzuelo", "Ptosis", "Ectropion", "Entropion"],
    conjunctiva: ["Clara", "Hiperemia Leve", "Hiperemia Mod/Sev", "Quemosis", "Pterigión I", "Pterigión II/III", "Pinguecula", "Folículos", "Papilas"],
    cornea: ["Transparente", "QPS", "Úlcera", "Leucoma", "Queratocono", "Edema", "Pannus"],
    chamber: ["Formada", "Estrecha", "Tyndall (+)", "Hipopion", "Hifema"],
    iris: ["Normal", "Sinequias", "Atrofia", "Rubeosis"],
    lens: ["Transparente", "Facosclerosis", "Cat. Nuclear", "Cat. Cortical", "Cat. Subcapsular", "LIO Centrado"]
  },
  posterior: {
    vitreous: ["Transparente", "DVP", "Miodesopsias", "Hemorragia"],
    nerve: ["Bordes Netos", "Excavación 0.3", "Excavación 0.5", "Excavación 0.8", "Palidez"],
    macula: ["Brillo Foveal", "Drusas", "Edema", "EPR Alterado"],
    vessels: ["Normales", "Tortuosidad", "Cruces A/V", "Hemorragias", "Exudados"],
    retinaPeriphery: ["Aplicada", "Desgarro", "Agujero", "Desprendimiento"]
  }
};

export const SEGMENTS_ANTERIOR = [
  { key: "lids", label: "Párpados y Anexos" },
  { key: "conjunctiva", label: "Conjuntiva" },
  { key: "cornea", label: "Córnea" },
  { key: "chamber", label: "Cámara Anterior" },
  { key: "iris", label: "Iris y Pupila" },
  { key: "lens", label: "Cristalino" }
];

export const SEGMENTS_POSTERIOR = [
  { key: "vitreous", label: "Vítreo" },
  { key: "nerve", label: "Nervio Óptico (Papila)" },
  { key: "macula", label: "Mácula" },
  { key: "vessels", label: "Vasos y Arcadas" },
  { key: "retinaPeriphery", label: "Retina Periférica" }
];

export const ALICIA_TEMPLATES = {
  "GLAUCOMA": "Padecimiento crónico. Disminución campo visual. AHF Glaucoma: [SI/NO]. Tx: [GOTAS].",
  "OJO_SECO": "Sensación cuerpo extraño y ardor AO. Empeora tardes. Mejora lubricantes.",
  "CONJUNTIVITIS": "Inicio agudo. Ojo rojo, secreción. Niega baja visual.",
  "REFRACTIVO": "Mala visión lejana gradual. Mejora con estenopeico. Cefalea.",
  "CATARATA": "Baja visual progresiva indolora. Deslumbramiento nocturno.",
  "DIABETICA": "DM [X] años. Baja visual variable. Fondo de ojo."
};