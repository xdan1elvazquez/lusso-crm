const KEY = "lusso_settings_v1";

// Valores por defecto
const DEFAULT_SETTINGS = {
  // Alertas de Inventario
  alerts: {
    minTotalFrames: 50,
    minMen: 10,
    minWomen: 10,
    minUnisex: 10,
    minKids: 5,
  },
  // Terminales Bancarias (NUEVO)
  terminals: [
    { id: "term_1", name: "Clip / Zettle", fee: 3.5 }, // 3.5% por defecto
    { id: "term_2", name: "Terminal Bancaria", fee: 1.5 }
  ]
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getSettings() {
  const data = read();
  // Merge con defaults por si agregamos campos nuevos y el usuario tenía versión vieja
  return { 
    alerts: { ...DEFAULT_SETTINGS.alerts, ...(data.alerts || {}) },
    terminals: data.terminals || DEFAULT_SETTINGS.terminals
  };
}

export function updateSettings(newSettings) {
  const current = read();
  const next = { ...current, ...newSettings };
  write(next);
  return next;
}

// Helpers específicos
export function getAlertSettings() { return getSettings().alerts; }
export function updateAlertSettings(alerts) { return updateSettings({ alerts }); }

export function getTerminals() { return getSettings().terminals; }
export function updateTerminals(terminals) { return updateSettings({ terminals }); }