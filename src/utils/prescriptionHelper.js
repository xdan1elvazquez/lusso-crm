/**
 * Genera la línea de instrucción para la receta médica.
 * @param {object} params
 * @param {string} params.productName - Nombre del medicamento
 * @param {string} params.type - "DROPS", "OINTMENT", "ORAL", "OTHER"
 * @param {string} params.dose - Cantidad (gotas, cm, tabletas)
 * @param {string} params.eye - "AO", "OD", "OI" (Opcional)
 * @param {string} params.freq - Frecuencia en horas
 * @param {string} params.duration - Duración en días
 */
export function buildPrescriptionInstruction(params) {
  const { productName, type, dose, eye, freq, duration } = params;

  if (!productName) return null;

  let instruction = "";

  switch (type) {
    case "DROPS":
      instruction = `Aplicar ${dose} gota(s) en ${eye} cada ${freq} hrs por ${duration} días.`;
      break;
    case "OINTMENT":
      instruction = `Aplicar ${dose} cm en fondo de saco ${eye} cada ${freq} hrs por ${duration} días.`;
      break;
    case "ORAL":
      instruction = `Tomar ${dose} (tab/cap) cada ${freq} hrs por ${duration} días.`;
      break;
    default:
      instruction = `Aplicar cada ${freq} hrs por ${duration} días.`;
      break;
  }

  return {
    fullText: `• ${productName}: ${instruction}`,
    instructionOnly: instruction
  };
}