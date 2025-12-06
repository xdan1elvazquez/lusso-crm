// src/utils/physicalExamConfig.js

export const GLASGOW_OPTS = {
  eye: [
    { val: 4, label: "4 - Espontánea" },
    { val: 3, label: "3 - A la orden verbal" },
    { val: 2, label: "2 - Al dolor" },
    { val: 1, label: "1 - Ninguna" }
  ],
  verbal: [
    { val: 5, label: "5 - Orientado y conversando" },
    { val: 4, label: "4 - Desorientado y hablando" },
    { val: 3, label: "3 - Palabras inapropiadas" },
    { val: 2, label: "2 - Sonidos incomprensibles" },
    { val: 1, label: "1 - Ninguna" }
  ],
  motor: [
    { val: 6, label: "6 - Obedece órdenes" },
    { val: 5, label: "5 - Localiza el dolor" },
    { val: 4, label: "4 - Flexión al dolor" },
    { val: 3, label: "3 - Flexión anormal" },
    { val: 2, label: "2 - Extensión anormal" },
    { val: 1, label: "1 - Ninguna" }
  ]
};

export const PE_GENERAL_CONFIG = {
  vitals: {
    title: "1. Signos Vitales",
    fields: [
      { id: "ta", label: "Tensión Arterial", type: "text", width: 100, placeholder: "120/80" },
      { id: "pa1", label: "PA Toma 1", type: "text", width: 80, placeholder: "120/80" },
      { id: "pa2", label: "PA Toma 2", type: "text", width: 80, placeholder: "120/80" },
      { id: "pa3", label: "PA Toma 3", type: "text", width: 80, placeholder: "120/80" },
      { id: "fc", label: "FC (lpm)", type: "number", width: 70 },
      { id: "fr", label: "FR (rpm)", type: "number", width: 70 },
      { id: "temp", label: "Temp (°C)", type: "number", width: 70 },
      { id: "sato2", label: "SatO2 (%)", type: "number", width: 70 },
      { id: "pulso", label: "Pulso", type: "text", width: 90, default: "Rítmico" }
    ]
  },
  anthro: {
    title: "2. Antropometría",
    fields: [
      { id: "peso", label: "Peso (kg)", type: "number", width: 80 },
      { id: "talla", label: "Talla (m)", type: "number", width: 80 },
      { id: "imc", label: "IMC", type: "number", width: 80, readOnly: true },
      { id: "cintura", label: "Cintura (cm)", type: "number", width: 80 },
      { id: "abdominal", label: "Abd (cm)", type: "number", width: 90 },
      { id: "pliegues", label: "Pliegues", type: "text", width: 120 },
      { id: "cefalico", label: "P. Cefálico", type: "number", width: 90 }
    ]
  },
  habitus: {
    title: "3. Inspección General / Habitus",
    fields: [
      { id: "apariencia", label: "Apariencia", type: "select", options: ["Buena", "Regular", "Mala"], default: "Buena" },
      { id: "facies", label: "Facies", type: "select", options: ["Normotípica", "Álgica", "Pálida", "Cianótica", "Caquéctica"], default: "Normotípica" },
      { id: "complexion", label: "Complexión", type: "select", options: ["Media", "Robusta", "Delgada"], default: "Media" },
      { id: "conformacion", label: "Conformación", type: "text", default: "Íntegra" },
      { id: "biotipo", label: "Biotipo", type: "select", options: ["Ectomorfo", "Mesomorfo", "Endomorfo"], default: "Mesomorfo" },
      { id: "grasa", label: "Distrib. Grasa", type: "text", default: "Homogénea" },
      { id: "movimientos", label: "Movimientos", type: "text", default: "Normales" },
      { id: "integridad", label: "Integridad", type: "text", default: "Conservada" },
      { id: "higiene", label: "Higiene", type: "select", options: ["Adecuada", "Regular", "Mala"], default: "Adecuada" },
      { id: "vestimenta", label: "Vestimenta", type: "text", default: "Adecuada" },
      { id: "edad_aparente", label: "Edad Aparente", type: "text", placeholder: "Acorde a cronológica" },
      { id: "nutricion", label: "Estado Nutricional", type: "text", default: "Eutrófico" },
      { id: "hidratacion", label: "Hidratación", type: "select", options: ["Hidratado", "Deshidratado"], default: "Hidratado" },
      { id: "posicion", label: "Posición", type: "text", default: "Libremente escogida" },
      { id: "postura", label: "Postura", type: "text", default: "Alineada" },
      { id: "actitud", label: "Actitud", type: "text", default: "Cooperadora" },
      { id: "marcha", label: "Marcha", type: "text", default: "Normal" },
      { id: "aditamentos", label: "Aditamentos", type: "text", placeholder: "Ninguno" },
      { id: "dolor_aparente", label: "Dolor Aparente", type: "boolean_detail", detailLabel: "Descripción" }
    ]
  },
  mental: {
    title: "4. Estado Mental y Conciencia",
    orientation: [
      { id: "tiempo", label: "Tiempo" },
      { id: "espacio", label: "Espacio" },
      { id: "persona", label: "Persona" }
    ],
    functions: [
      { id: "conducta", label: "Conducta", type: "text", default: "Cooperador" },
      { id: "contacto", label: "Contacto Visual", type: "select", options: ["Sí", "No", "Parcial"], default: "Sí" },
      { id: "actitud_mental", label: "Actitud", type: "text", default: "Tranquila" },
      { id: "pensamiento", label: "Pensamiento", type: "text", default: "Lógico" },
      { id: "juicio", label: "Juicio", type: "text", default: "Conservado" },
      { id: "insight", label: "Insight", type: "text", default: "Conservado" },
      { id: "animo", label: "Ánimo", type: "text", default: "Eutímico" },
      { id: "afecto", label: "Afecto", type: "text", default: "Apropiado" },
      { id: "atencion", label: "Atención", type: "text", default: "Adecuada" },
      { id: "concentracion", label: "Concentración", type: "text", default: "Normal" },
      { id: "memoria", label: "Memoria", type: "text", default: "Conservada" }
    ]
  },
  skin: {
    title: "5. Piel y Faneras",
    // Toggles: true = tiene la condición (anormal), excepto 'integra'
    skinToggles: [
      { id: "integra", label: "Piel Íntegra", default: true, invertLogic: true }, 
      { id: "palidez", label: "Palidez" },
      { id: "cianosis", label: "Cianosis" },
      { id: "ictericia", label: "Ictericia" },
      { id: "erupciones", label: "Erupciones" },
      { id: "rubor", label: "Rubor" },
      { id: "livedo", label: "Livedo" },
      { id: "lesiones", label: "Lesiones (Describir)" }
    ],
    skinFields: [
      { id: "coloracion", label: "Coloración", type: "text", default: "Normocoloreada" },
      { id: "fototipo", label: "Fototipo", type: "text" },
      { id: "temperatura", label: "Temperatura", type: "text", default: "Normotermia" },
      { id: "humedad", label: "Humedad", type: "text", default: "Normal" },
      { id: "elasticidad", label: "Elasticidad", type: "text", default: "Conservada" },
      { id: "turgor", label: "Turgor", type: "text", default: "Normal" },
      { id: "textura", label: "Textura", type: "text", default: "Suave" }
    ],
    fanerasFields: [
      { id: "unas", label: "Uñas", type: "text", default: "Normoconfiguradas" },
      { id: "vello", label: "Vello Corporal", type: "text", default: "Normoconfigurado" },
      { id: "pestanas", label: "Pestañas", type: "text", default: "Normoconfiguradas" },
      { id: "cejas", label: "Cejas", type: "text", default: "Normoconfiguradas" }
    ],
    hairFields: [
      { id: "implantacion", label: "Implantación", type: "text", default: "Normal" },
      { id: "distribucion", label: "Distribución", type: "text", default: "Normal" },
      { id: "consistencia", label: "Consistencia", type: "text", default: "Normal" },
      { id: "cantidad", label: "Cantidad", type: "text", default: "Normal" }
    ],
    hairToggles: [
      { id: "alopecia", label: "Alopecia" },
      { id: "fragilidad", label: "Fragilidad Capilar" }
    ]
  }
};

export const getPhysicalExamDefaults = () => ({
  vitals: {}, 
  anthro: {},
  habitus: { 
    apariencia: "Buena", facies: "Normotípica", complexion: "Media", conformacion: "Íntegra", biotipo: "Mesomorfo",
    grasa: "Homogénea", movimientos: "Normales", integridad: "Conservada", higiene: "Adecuada", vestimenta: "Adecuada",
    nutricion: "Eutrófico", hidratacion: "Hidratado", posicion: "Libremente escogida", postura: "Alineada", actitud: "Cooperadora",
    marcha: "Normal", dolor_aparente: { active: false, detail: "" }
  },
  mental: { 
    glasgow: { e: 4, v: 5, m: 6, total: 15, nivel: "Alerta", observaciones: "" },
    orientacion: { tiempo: true, espacio: true, persona: true }, // true = orientada
    atencion: "Normal", memoria: "Conservada", lenguaje: "Coherente", conducta: "Cooperador", 
    animo: "Eutímico", contacto: "Sí", juicio: "Conservado", pensamiento: "Lógico", insight: "Conservado", afecto: "Apropiado"
  },
  skin: {
    integridad: "Íntegra", coloracion: "Normocoloreada", temperatura: "Normotermia", humedad: "Normal", elasticidad: "Conservada", turgor: "Normal", textura: "Suave",
    palidez: false, cianosis: false, ictericia: false, erupciones: false, rubor: false, livedo: false, lesiones: { active: false, detail: "" },
    unas: "Normoconfiguradas", vello: "Normoconfigurado", pestanas: "Normoconfiguradas", cejas: "Normoconfiguradas",
    hair: { implantacion: "Normal", distribucion: "Normal", consistencia: "Normal", cantidad: "Normal" },
    alopecia: false, fragilidad: false
  }
});