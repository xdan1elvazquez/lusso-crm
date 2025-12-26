import { db } from "@/firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const SETTINGS_DOC_REF = doc(db, "settings", "global");

// 1. Definimos Materiales por defecto (Micas)
const DEFAULT_LENS_MATERIALS = [
  "CR-39", "Policarbonato", "Hi-Index 1.56", "Hi-Index 1.60", 
  "Hi-Index 1.67", "Hi-Index 1.74", "Trivex", "Cristal"
].map(name => ({ id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'), name: name, active: true }));

// 2. Definimos Tratamientos por defecto
const DEFAULT_LENS_TREATMENTS = [
  "Blanco", "Antireflejante (AR)", "Blue Ray / Blue Free", 
  "Fotocromático (Grey)", "Fotocromático (Brown)", 
  "Polarizado", "Espejeado", "Transitions"
].map(name => ({ id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'), name: name, active: true }));

// 3. NUEVO: Definimos Materiales y Colores por defecto para ARMAZONES
const DEFAULT_FRAME_MATERIALS = ["Acetato", "Metal", "Titanio", "TR90", "Ultem", "Acero Inoxidable", "Combinado", "Otro"];
const DEFAULT_FRAME_COLORS = ["Negro", "Café", "Dorado", "Plateado", "Azul", "Rojo", "Rosa", "Morado", "Carey", "Transparente", "Gris", "Verde", "Bicolor", "Otro"];

// 4. Configuración Principal
const DEFAULT_SETTINGS = {
  organization: {
    name: "Lusso Visual",
    address: "Calle Ejemplo 123",
    phone: "55 1234 5678",
    doctorName: "Dr. Responsable",
    cedula: "0000000",
    logoUrl: "" 
  },
  alerts: { minTotalFrames: 50, minMen: 10, minWomen: 10, minUnisex: 10, minKids: 5 },
  terminals: [
    { id: "term_default", name: "Terminal Bancaria", fee: 3.5, rates: { 3: 0, 6: 0, 9: 0, 12: 0 } }
  ],
  referralSources: ["Recomendación", "Google Maps", "Facebook", "Instagram", "TikTok", "Otro"],
  loyalty: {
    enabled: true, pointsName: "Puntos Lusso", conversionRate: 1.0,
    earningRates: { GLOBAL: 5, EFECTIVO: 5, TARJETA: 2, TRANSFERENCIA: 5, OTRO: 0 },
    referralBonusPercent: 2
  },
  diabetesMeds: ["Metformina", "Glibenclamida", "Insulina Glargina", "Sitagliptina", "Dapagliflozina"],
  hypertensionMeds: ["Losartán", "Captopril", "Enalapril", "Amlodipino", "Telmisartán"],
  lensMaterials: DEFAULT_LENS_MATERIALS,
  lensTreatments: DEFAULT_LENS_TREATMENTS,
  
  // Agregamos las nuevas listas al settings global
  frameMaterials: DEFAULT_FRAME_MATERIALS,
  frameColors: DEFAULT_FRAME_COLORS
};

// --- LECTURA ---
export async function getSettings() {
  try {
    const snap = await getDoc(SETTINGS_DOC_REF);
    if (snap.exists()) {
      return { ...DEFAULT_SETTINGS, ...snap.data() };
    } else {
      await setDoc(SETTINGS_DOC_REF, DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.error("Error leyendo settings:", error);
    return DEFAULT_SETTINGS;
  }
}

// --- ESCRITURA ---
export async function updateSettings(newSettings) {
  await setDoc(SETTINGS_DOC_REF, newSettings, { merge: true });
  return newSettings;
}

// --- HELPERS ESPECÍFICOS ---
export async function getOrgSettings() { const s = await getSettings(); return s.organization; }
export async function updateOrgSettings(organization) { return updateSettings({ organization }); }

export async function getAlertSettings() { const s = await getSettings(); return s.alerts; }
export async function updateAlertSettings(alerts) { return updateSettings({ alerts }); }

export async function getTerminals() { const s = await getSettings(); return s.terminals; }
export async function updateTerminals(terminals) { return updateSettings({ terminals }); }

export async function getReferralSources() { const s = await getSettings(); return s.referralSources; }
export async function updateReferralSources(list) { return updateSettings({ referralSources: list }); }

export async function getLoyaltySettings() { const s = await getSettings(); return s.loyalty; }
export async function updateLoyaltySettings(loyalty) { return updateSettings({ loyalty }); }

export async function getDiabetesMeds() { const s = await getSettings(); return s.diabetesMeds; }
export async function updateDiabetesMeds(list) { return updateSettings({ diabetesMeds: list }); }

export async function getHypertensionMeds() { const s = await getSettings(); return s.hypertensionMeds; }
export async function updateHypertensionMeds(list) { return updateSettings({ hypertensionMeds: list }); }

export async function getLensMaterials() { const s = await getSettings(); return s.lensMaterials || DEFAULT_LENS_MATERIALS; }
export async function updateLensMaterials(list) { return updateSettings({ lensMaterials: list }); }

export async function getLensTreatments() { const s = await getSettings(); return s.lensTreatments || DEFAULT_LENS_TREATMENTS; }
export async function updateLensTreatments(list) { return updateSettings({ lensTreatments: list }); }

// 👇 NUEVOS HELPERS PARA ARMAZONES
export async function getFrameCatalogs() {
    const s = await getSettings();
    return {
        materials: s.frameMaterials || DEFAULT_FRAME_MATERIALS,
        colors: s.frameColors || DEFAULT_FRAME_COLORS
    };
}

export async function updateFrameCatalogs(materials, colors) {
    return updateSettings({
        frameMaterials: materials,
        frameColors: colors
    });
}