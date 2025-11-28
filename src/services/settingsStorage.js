const KEY = "lusso_settings_v1";

const DEFAULT_SETTINGS = {
  alerts: {
    minTotalFrames: 50,
    minMen: 10,
    minWomen: 10,
    minUnisex: 10,
    minKids: 5,
  },
  terminals: [
    // Estructura robusta con tasas por defecto
    { id: "term_default", name: "Terminal Bancaria", fee: 3.5, rates: { 3: 0, 6: 0, 9: 0, 12: 0 } }
  ],
  referralSources: [
    "Recomendación", "Google Maps", "Facebook", "Instagram", "TikTok", "Volanteo", "Pasaba por aquí", "Otro"
  ],
  loyalty: {
    enabled: true,
    pointsName: "Puntos Lusso",
    conversionRate: 1.0,
    earningRates: { GLOBAL: 5, EFECTIVO: 5, TARJETA: 2, TRANSFERENCIA: 5, OTRO: 0 },
    referralBonusPercent: 2
  }
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
    
    // AUTO-CORRECCIÓN: Si hay terminales viejas sin 'rates', se las agregamos
    if (data.terminals) {
        data.terminals = data.terminals.map(t => ({
            ...t,
            rates: t.rates || { 3: 0, 6: 0, 9: 0, 12: 0 }
        }));
    }
    return data;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function write(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

export function getSettings() {
  const data = read();
  return { 
    alerts: { ...DEFAULT_SETTINGS.alerts, ...(data.alerts || {}) },
    terminals: Array.isArray(data.terminals) ? data.terminals : DEFAULT_SETTINGS.terminals,
    referralSources: data.referralSources || DEFAULT_SETTINGS.referralSources,
    loyalty: { ...DEFAULT_SETTINGS.loyalty, ...(data.loyalty || {}) }
  };
}

export function updateSettings(newSettings) {
  const current = read();
  const next = { ...current, ...newSettings };
  write(next);
  return next;
}

// Helpers
export function getAlertSettings() { return getSettings().alerts; }
export function updateAlertSettings(alerts) { return updateSettings({ alerts }); }
export function getTerminals() { return getSettings().terminals; }
export function updateTerminals(terminals) { return updateSettings({ terminals }); }
export function getReferralSources() { return getSettings().referralSources; }
export function getLoyaltySettings() { return getSettings().loyalty; }
export function updateLoyaltySettings(loyalty) { return updateSettings({ loyalty }); }