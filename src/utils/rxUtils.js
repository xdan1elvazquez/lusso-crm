/**
 * src/utils/rxUtils.js
 * Normaliza valores de dioptría para asegurar compatibilidad estricta.
 */

export function parseDiopter(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  // Redondeo al 0.25 más cercano (ej. -4.1 -> -4.00, -4.15 -> -4.25)
  return Math.round(num * 4) / 4;
}

export function formatDiopter(value) {
  const num = parseDiopter(value);
  // Siempre mostrar 2 decimales (ej. -4.00)
  return num.toFixed(2);
}