export const NON_PATHOLOGICAL_SECTIONS = [
  {
    id: "development",
    title: "1. Desarrollo Fisiológico",
    fields: [
      { id: "birth_type", label: "Vía de nacimiento", type: "select", options: ["Parto Natural", "Cesárea", "Fórceps", "Otro"] },
      { id: "birth_compl", label: "Complicaciones al nacer", type: "text" },
      { id: "psychomotor", label: "Desarrollo Psicomotor (Hitos)", type: "text", placeholder: "Sostuvo cabeza, caminó, habló..." },
      { id: "puberty", label: "Desarrollo Puberal (Menarca/Espermarca)", type: "text" },
      { id: "menopause", label: "Menopausia / Andropausia", type: "text" }
    ]
  },
  {
    id: "sexual",
    title: "2. Vida Sexual",
    fields: [
      { id: "sexual_onset", label: "Edad de inicio (IVSA)", type: "number", width: "100px" },
      { id: "partners", label: "Parejas sexuales", type: "text", width: "100px" },
      { id: "contraception", label: "Métodos anticonceptivos", type: "text" },
      { id: "orientation", label: "Preferencia Sexual", type: "text" } // Texto libre para flexibilidad
    ]
  },
  {
    id: "nutrition",
    title: "3. Alimentación",
    fields: [
      { id: "diet_quality", label: "¿Considera que come bien?", type: "boolean" },
      { id: "diet_type", label: "Tipo de dieta", type: "select", options: ["Omnívora", "Vegetariana", "Vegana", "Keto", "Especial/Médica"] },
      { id: "water_intake", label: "Consumo de Agua (L/día)", type: "text" },
      { id: "soda_coffee", label: "Refrescos / Café", type: "text" },
      { id: "food_freq", label: "Frecuencia Alimentos (Carnes/Verduras)", type: "textarea", rows: 2 },
      { id: "food_allergies", label: "Alergias / Intolerancias", type: "text" }
    ]
  },
  {
    id: "toxic",
    title: "4. Hábitos Toxicológicos",
    fields: [
      { id: "smoking", label: "Tabaquismo", type: "boolean_detail", detailLabel: "Cigarros/día y años" },
      { id: "alcohol", label: "Alcoholismo", type: "boolean_detail", detailLabel: "Frecuencia y tipo" },
      { id: "drugs", label: "Drogas / Marihuana", type: "boolean_detail", detailLabel: "Tipo y frecuencia" },
      { id: "vaping", label: "Vapeador / E-Cigar", type: "boolean_detail", detailLabel: "Frecuencia" }
    ]
  },
  {
    id: "environment",
    title: "5. Ambiente y Vivienda",
    fields: [
      { id: "housing_type", label: "Zona Vivienda", type: "select", options: ["Urbana", "Rural", "Suburbana"] },
      { id: "services", label: "Servicios Básicos (Agua/Luz/Drenaje)", type: "select", options: ["Completos", "Incompletos"] },
      { id: "zoonosis", label: "Convivencia con Animales", type: "text" },
      { id: "ventilation", label: "Hacinamiento / Ventilación", type: "text" },
      { id: "chemicals", label: "Exposición a Químicos/Humo", type: "boolean_detail" }
    ]
  },
  {
    id: "occupation",
    title: "6. Laboral",
    fields: [
      { id: "current_job", label: "Actividad Actual", type: "text" },
      { id: "prev_job", label: "Actividad Previa", type: "text" },
      { id: "risks", label: "Riesgos / Tóxicos Laborales", type: "text" },
      { id: "computer_use", label: "Uso de Computadora (hrs/día)", type: "number", width: "80px" }
    ]
  },
  {
    id: "physical_activity",
    title: "7. Actividad Física",
    fields: [
      { id: "sports", label: "Realiza Deporte", type: "boolean_detail", detailLabel: "¿Cuál y frecuencia?" },
      { id: "heavy_lifting", label: "Carga Pesado / Esfuerzo", type: "boolean" }
    ]
  },
  {
    id: "hygiene",
    title: "8. Higiene",
    fields: [
      { id: "shower", label: "Baño (frecuencia)", type: "text" },
      { id: "teeth", label: "Cepillado dental", type: "text" },
      { id: "hand_washing", label: "Lavado de manos", type: "text" },
      { id: "eye_hygiene", label: "Higiene de Párpados / Ojos", type: "text" }
    ]
  },
  {
    id: "emotional",
    title: "9. Estado Emocional",
    fields: [
      { id: "stress", label: "¿Se considera nervioso/a?", type: "boolean" },
      { id: "tension", label: "Tensión reciente / Estrés", type: "boolean_detail" },
      { id: "sleep_quality", label: "Calidad de Sueño", type: "select", options: ["Buena", "Regular", "Mala", "Insomnio"] },
      { id: "sleep_hours", label: "Horas de sueño", type: "number", width: "80px" }
    ]
  },
  {
    id: "health_habits",
    title: "10. Hábitos de Salud",
    fields: [
      { id: "vaccines", label: "Esquema Vacunación", type: "select", options: ["Completo", "Incompleto", "Desconocido"] },
      { id: "covid", label: "Vacuna COVID", type: "text" },
      { id: "last_checkup", label: "Último Check-up General", type: "date" },
      { id: "blood_type", label: "Grupo Sanguíneo", type: "text", width: "100px" }
    ]
  },
  {
    id: "visual_habits",
    title: "11. Hábitos Visuales y Lentes",
    fields: [
      { id: "screen_time", label: "Tiempo total en pantallas (hrs/día)", type: "number" },
      { id: "uses_glasses", label: "¿Usa Lentes actualmente?", type: "boolean" },
      { id: "glasses_age", label: "Tiempo de uso (años)", type: "text" },
      { id: "contact_lenses", label: "¿Usa Lentes de Contacto?", type: "boolean_detail", detailLabel: "Tipo y Frecuencia" },
      { id: "glasses_condition", label: "Estado actual de sus lentes", type: "text", placeholder: "Rayados, flojos, buen estado..." },
      { id: "visual_comfort", label: "¿Se siente bien con su graduación?", type: "boolean" }
    ]
  }
];