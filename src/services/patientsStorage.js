const KEY = "lusso_patients_v1";

function read() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

export function seedPatientsIfEmpty() {
  const list = read();
  if (list.length) return;
  write([{
      id: crypto.randomUUID(), firstName: "Cristian", lastName: "Demo", phone: "0000000000", email: "demo@lusso.mx",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastViewed: new Date().toISOString(),
      dob: "1990-01-01", sex: "HOMBRE", occupation: "Desarrollador", referralSource: "Google Maps", referredBy: null, points: 0,
      taxData: { rfc: "", razonSocial: "", regimen: "", cp: "", emailFactura: "" },
      address: { street: "", externalNumber: "", internalNumber: "", suburb: "", city: "", state: "", zip: "" }
  }]);
}

export function getPatients() { return read().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")); }
export function getPatientById(id) { return read().find((p) => p.id === id) || null; }
export function getPatientsRecommendedBy(patientId) { return read().filter(p => p.referredBy === patientId); }

export function touchPatientView(id) {
  const list = read();
  const next = list.map(p => p.id === id ? { ...p, lastViewed: new Date().toISOString() } : p);
  write(next);
}

export function createPatient(data) {
  const list = read();
  const now = new Date().toISOString();
  const patient = {
    id: crypto.randomUUID(),
    createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : now,
    updatedAt: now, lastViewed: now,
    firstName: data.firstName?.trim() || "", lastName: data.lastName?.trim() || "",
    phone: data.phone?.trim() || "", email: data.email?.trim() || "",
    dob: data.dob || "", sex: data.sex || "NO_ESPECIFICADO", occupation: data.occupation?.trim() || "",
    referralSource: data.referralSource || "Otro", referredBy: data.referredBy || null, points: 0,
    
    taxData: {
        rfc: data.taxData?.rfc || "",
        razonSocial: data.taxData?.razonSocial || "",
        regimen: data.taxData?.regimen || "",
        cp: data.taxData?.cp || "",
        emailFactura: data.taxData?.emailFactura || data.email || ""
    },
    
    // NUEVO: DIRECCIÓN FÍSICA
    address: {
        street: data.address?.street || "",
        externalNumber: data.address?.externalNumber || "",
        internalNumber: data.address?.internalNumber || "",
        suburb: data.address?.suburb || "", // Colonia
        city: data.address?.city || "",
        state: data.address?.state || "",
        zip: data.address?.zip || "" // Código Postal (Clave para estadística)
    }
  };
  write([patient, ...list]);
  return patient;
}

export function updatePatient(id, data) {
  const list = read();
  const now = new Date().toISOString();
  const next = list.map((p) =>
    p.id === id ? {
          ...p, ...data,
          taxData: { ...p.taxData, ...(data.taxData || {}) },
          address: { ...p.address, ...(data.address || {}) }, // Merge seguro de dirección
          createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : p.createdAt,
          updatedAt: now,
        } : p
  );
  write(next);
  return next.find((p) => p.id === id) || null;
}

export function adjustPatientPoints(id, amount) {
  const list = read();
  const next = list.map(p => {
    if (p.id !== id) return p;
    const current = Number(p.points) || 0;
    const newBalance = current + Number(amount);
    return { ...p, points: newBalance < 0 ? 0 : newBalance };
  });
  write(next);
}

export function deletePatient(id) { write(read().filter((p) => p.id !== id)); }