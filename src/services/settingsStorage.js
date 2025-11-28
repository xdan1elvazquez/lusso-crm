const KEY = "lusso_settings_v1";

// Valores por defecto (para cuando inicias el sistema por primera vez)
const DEFAULT_ALERTS = {
  minTotalFrames: 50,    // Mínimo de armazones totales
  minMen: 10,            // Mínimo para hombres
  minWomen: 10,          // Mínimo para mujeres
  minUnisex: 10,         // Mínimo unisex
  minKids: 5,            // Mínimo niños
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : DEFAULT_ALERTS;
  } catch {
    return DEFAULT_ALERTS;
  }
}

function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

// Obtener configuración actual
export function getAlertSettings() {
  return read();
}

// Guardar nueva configuración
export function updateAlertSettings(newSettings) {
  const current = read();
  const next = { ...current, ...newSettings };
  write(next);
  return next;
}