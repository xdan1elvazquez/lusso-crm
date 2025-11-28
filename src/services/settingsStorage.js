const KEY = "lusso_settings_v1";

const DEFAULT_SETTINGS = {
  // DATOS DE LA CLÍNICA (NOM-004)
  organization: {
    name: "Lusso Visual",
    address: "Calle Ejemplo 123, Col. Centro",
    phone: "55 1234 5678",
    doctorName: "Dr. Responsable",
    cedula: "0000000",
    university: "UNAM",
    logoUrl: "" // Futuro: Logo en base64
  },
  alerts: {
    minTotalFrames: 50, minMen: 10, minWomen: 10, minUnisex: 10, minKids: 5,
  },
  terminals: [
    { id: "term_default", name: "Terminal Bancaria", fee: 3.5, rates: { 3: 0, 6: 0, 9: 0, 12: 0 } }
  ],
  referralSources: [
    "Recomendación", "Google Maps", "Facebook", "Instagram", "TikTok", "Volanteo", "Pasaba por aquí", "Otro"
  ],
  loyalty: {
    enabled: true, pointsName: "Puntos Lusso", conversionRate: 1.0,
    earningRates: { GLOBAL: 5, EFECTIVO: 5, TARJETA: 2, TRANSFERENCIA: 5, OTRO: 0 },
    referralBonusPercent: 2
  }
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
    // Auto-corrección de estructura
    if (!data.organization) data.organization = DEFAULT_SETTINGS.organization;
    if (data.terminals) {
      data.terminals = data.terminals.map(t => ({ ...t, rates: t.rates || { 3: 0, 6: 0, 9: 0, 12: 0 } }));
    }
    return data;
  } catch { return DEFAULT_SETTINGS; }
}

function write(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

export function getSettings() {
  const data = read();
  return { 
    ...DEFAULT_SETTINGS, 
    ...data,
    organization: { ...DEFAULT_SETTINGS.organization, ...data.organization },
    alerts: { ...DEFAULT_SETTINGS.alerts, ...data.alerts },
    loyalty: { ...DEFAULT_SETTINGS.loyalty, ...data.loyalty }
  };
}

export function updateSettings(newSettings) {
  const current = read();
  const next = { ...current, ...newSettings };
  write(next);
  return next;
}

// Helpers
export function getOrgSettings() { return getSettings().organization; }
export function updateOrgSettings(organization) { return updateSettings({ organization }); }

export function getAlertSettings() { return getSettings().alerts; }
export function updateAlertSettings(alerts) { return updateSettings({ alerts }); }
export function getTerminals() { return getSettings().terminals; }
export function updateTerminals(terminals) { return updateSettings({ terminals }); }
export function getReferralSources() { return getSettings().referralSources; }
export function getLoyaltySettings() { return getSettings().loyalty; }
export function updateLoyaltySettings(loyalty) { return updateSettings({ loyalty }); }