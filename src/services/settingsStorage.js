const KEY = "lusso_settings_v1";

// Lista inicial basada en lo que tenías hardcodeado
const DEFAULT_LENS_MATERIALS = [
  "CR-39", "Policarbonato", "Hi-Index 1.56", "Hi-Index 1.60", 
  "Hi-Index 1.67", "Hi-Index 1.74", "Trivex", "Cristal"
].map(name => ({
  id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'), // Generar ID estable simple
  name: name,
  active: true
}));

const DEFAULT_SETTINGS = {
  // DATOS DE LA CLÍNICA (NOM-004)
  organization: {
    name: "Lusso Visual",
    address: "Calle Ejemplo 123, Col. Centro",
    phone: "55 1234 5678",
    doctorName: "Dr. Responsable",
    cedula: "0000000",
    university: "UNAM",
    logoUrl: "" 
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
  },
  // NUEVO: Catálogos Separados por Enfermedad
  diabetesMeds: [
      "Metformina", "Glibenclamida", "Insulina Glargina", "Insulina NPH", 
      "Sitagliptina", "Dapagliflozina", "Empagliflozina", "Linagliptina"
  ],
  hypertensionMeds: [
      "Losartán", "Captopril", "Enalapril", "Amlodipino", "Telmisartán", 
      "Hidroclorotiazida", "Nifedipino", "Candesartán"
  ],
  // NUEVO: Catálogo de Materiales (Seed)
  lensMaterials: DEFAULT_LENS_MATERIALS
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
    // Asegurar que lensMaterials exista si el storage ya estaba creado
    return { ...DEFAULT_SETTINGS, ...parsed }; 
  } catch { return DEFAULT_SETTINGS; }
}

function write(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

export function getSettings() { return read(); }

export function updateSettings(newSettings) {
  const current = read();
  const next = { ...current, ...newSettings };
  write(next);
  return next;
}

// Helpers generales
export function getOrgSettings() { return getSettings().organization; }
export function updateOrgSettings(organization) { return updateSettings({ organization }); }

export function getAlertSettings() { return getSettings().alerts; }
export function updateAlertSettings(alerts) { return updateSettings({ alerts }); }
export function getTerminals() { return getSettings().terminals; }
export function updateTerminals(terminals) { return updateSettings({ terminals }); }
export function getReferralSources() { return getSettings().referralSources; }
export function getLoyaltySettings() { return getSettings().loyalty; }
export function updateLoyaltySettings(loyalty) { return updateSettings({ loyalty }); }

// NUEVO: Helpers Específicos por Enfermedad
export function getDiabetesMeds() { return getSettings().diabetesMeds; }
export function updateDiabetesMeds(list) { return updateSettings({ diabetesMeds: list }); }

export function getHypertensionMeds() { return getSettings().hypertensionMeds; }
export function updateHypertensionMeds(list) { return updateSettings({ hypertensionMeds: list }); }

// NUEVO: Helpers Materiales Lentes
export function getLensMaterials() { return getSettings().lensMaterials || DEFAULT_LENS_MATERIALS; }
export function updateLensMaterials(list) { return updateSettings({ lensMaterials: list }); }