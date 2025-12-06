// src/utils/ipasExtendedConfig.js

export const INTENSITY_SCALE = ["Leve", "Moderado", "Severo", "1/10", "2/10", "3/10", "4/10", "5/10", "6/10", "7/10", "8/10", "9/10", "10/10"];

export const IPAS_EXTENDED_CONFIG = {
  senses: {
    id: "senses",
    title: "II-V. Órganos de los Sentidos (Audición, Olfato, Gusto, Tacto)",
    symptoms: [
      { id: "hipoacusia", label: "Hipoacusia / Sordera" },
      { id: "tinnitus", label: "Tinnitus / Acúfenos" },
      { id: "otalgia", label: "Otalgia (Dolor oído)" },
      { id: "otorrea", label: "Otorrea / Secreción" },
      { id: "hiposmia", label: "Hiposmia / Anosmia (Olfato)" },
      { id: "disgeusia", label: "Disgeusia (Gusto)" },
      { id: "parestesias_tacto", label: "Alteraciones del Tacto" }
    ]
  },
  respiratory: {
    id: "respiratory",
    title: "Sistema Respiratorio",
    symptoms: [
      { id: "boca_seca", label: "Boca seca" },
      { id: "tos", label: "Tos" },
      { id: "expectoracion", label: "Expectoración" },
      { id: "hemoptisis", label: "Hemoptisis" },
      { id: "disnea", label: "Disnea" },
      { id: "dolor_toracico", label: "Dolor torácico" },
      { id: "sibilancias", label: "Sibilancias" },
      { id: "rinorrea", label: "Rinorrea" },
      { id: "estornudos", label: "Estornudos" },
      { id: "prurito_nasal", label: "Prurito nasal" },
      { id: "fiebre", label: "Fiebre" },
      { id: "escalofrios", label: "Escalofríos" },
      { id: "sudoracion", label: "Sudoración nocturna" },
      { id: "ronquido", label: "Ronquido" },
      { id: "apneas", label: "Apneas nocturnas" }
    ]
  },
  digestive: {
    id: "digestive",
    title: "Sistema Digestivo",
    symptoms: [
      { id: "nauseas", label: "Náuseas" },
      { id: "vomito", label: "Vómito / Emesis" },
      { id: "hematemesis", label: "Hematemesis" },
      { id: "reflujo", label: "Reflujo / Regurgitación" },
      { id: "pirosis", label: "Pirosis (Ardor)" },
      { id: "disfagia", label: "Disfagia" },
      { id: "distension", label: "Distensión / Meteorismo" },
      { id: "melena", label: "Melena" },
      { id: "cambios_habito", label: "Cambios hábito intestinal" },
      { id: "diarrea", label: "Diarrea" },
      { id: "estrenimiento", label: "Estreñimiento" },
      { id: "dolor_rectal", label: "Dolor / Sangrado rectal" },
      { id: "ictericia_dig", label: "Ictericia" },
      { id: "coluria", label: "Coluria / Acolia" },
      { id: "dolor_abdominal", label: "Dolor abdominal" }
    ]
  },
  urinary: {
    id: "urinary",
    title: "Sistema Genitourinario",
    symptoms: [
      { id: "incontinencia", label: "Incontinencia" },
      { id: "enuresis", label: "Enuresis" },
      { id: "disuria", label: "Disuria (Dolor)" },
      { id: "polaquiuria", label: "Polaquiuria" },
      { id: "nicturia", label: "Nicturia" },
      { id: "hematuria", label: "Hematuria" },
      { id: "tenesmo_vesical", label: "Tenesmo vesical" }
    ]
  },
  gyneco: {
    id: "gyneco",
    title: "Ginecológico y Obstétrico",
    // Campos estáticos que aparecen al inicio
    headerFields: [
      { id: "fum", label: "FUM (Fecha Última Menstruación)", type: "date", width: 140 },
      { id: "ciclo", label: "Ciclo (Días/Reg)", type: "text", width: 100, placeholder: "Ej. 28/Regular" },
      { id: "gestas", label: "G (Gestas)", type: "number", width: 60 },
      { id: "partos", label: "P (Partos)", type: "number", width: 60 },
      { id: "cesareas", label: "C (Cesáreas)", type: "number", width: 60 },
      { id: "abortos", label: "A (Abortos)", type: "number", width: 60 },
      { id: "metodo_plan", label: "Método Anticonceptivo", type: "text", width: 150 },
      { id: "menopausia", label: "Menopausia (Edad/Fecha)", type: "text", width: 120 }
    ],
    // Síntomas por excepción
    symptoms: [
      { id: "dismenorrea", label: "Dismenorrea (Cólicos)" },
      { id: "sangrados_anormales", label: "Sangrados Anormales" },
      { id: "flujo", label: "Flujo Vaginal (Olor/Color)" },
      { id: "dispareunia", label: "Dispareunia" },
      { id: "prurito_vaginal", label: "Prurito vaginal" },
      { id: "dolor_pelvico", label: "Dolor pélvico" }
    ]
  },
  skin: {
    id: "skin",
    title: "Piel y Faneras",
    symptoms: [
      { id: "prurito_piel", label: "Prurito" },
      { id: "dolor_piel", label: "Dolor / Ardor cutáneo" },
      { id: "resequedad", label: "Resequedad" },
      { id: "cambios_color", label: "Cambios coloración (Palidez/Cianosis/Ictericia)" },
      { id: "lesiones", label: "Lesiones (Ronchas/Manchas/Úlceras)" },
      { id: "hiperhidrosis", label: "Hiperhidrosis / Anhidrosis" },
      { id: "alopecia", label: "Calvicie / Alopecia" },
      { id: "unas", label: "Cambios en uñas (Fragilidad/Color)" }
    ]
  }
};