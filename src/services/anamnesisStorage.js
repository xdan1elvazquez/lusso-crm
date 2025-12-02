const KEY = "lusso_anamnesis_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function normalizeAnamnesis(item) {
  const base = item || {};
  return {
    id: base.id,
    patientId: base.patientId,
    createdAt: base.createdAt || new Date().toISOString(),
    
    // ESTRUCTURA DE PADECIMIENTOS
    systemic: base.systemic || {},       // Personales Patológicos
    nonPathological: base.nonPathological || {}, // 👈 NUEVO: Personales NO Patológicos
    ocular: base.ocular || {},           // Antecedentes Oculares
    family: base.family || {},           // Heredofamiliares
    
    // Campos libres
    allergies: base.allergies || "",
    medications: base.medications || "", 
    observations: base.observations || ""
  };
}

export function getAllAnamnesis() {
  return read().map(normalizeAnamnesis).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getAnamnesisByPatientId(patientId) {
  if (!patientId) return [];
  return getAllAnamnesis().filter((a) => a.patientId === patientId);
}

// Obtener la ÚLTIMA historia para clonarla
export function getLastAnamnesis(patientId) {
  const list = getAnamnesisByPatientId(patientId);
  return list.length > 0 ? list[0] : null;
}

export function createAnamnesis(payload) {
  const list = read();
  const newEntry = normalizeAnamnesis({
    id: crypto.randomUUID(),
    ...payload,
    createdAt: new Date().toISOString(),
  });
  write([newEntry, ...list]);
  return newEntry;
}

export function deleteAnamnesis(id) {
  write(read().filter((a) => a.id !== id));
}