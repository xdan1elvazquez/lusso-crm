const KEY = "lusso_anamnesis_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getAllAnamnesis() {
  return read();
}

export function getAnamnesisByPatientId(patientId) {
  if (!patientId) return [];
  return read().filter((a) => a.patientId === patientId);
}

export function createAnamnesis(payload) {
  if (!payload?.patientId) throw new Error("patientId es requerido");
  const list = read();
  const now = new Date().toISOString();
  const item = {
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    patientId: payload.patientId,
    createdAt: now,
    diabetes: Boolean(payload.diabetes),
    hypertension: Boolean(payload.hypertension),
    asthma: Boolean(payload.asthma),
    allergies: payload.allergies?.trim?.() || "",
    currentMeds: payload.currentMeds?.trim?.() || "",
    surgeries: payload.surgeries?.trim?.() || "",
    ocularHistory: payload.ocularHistory?.trim?.() || "",
    notes: payload.notes?.trim?.() || "",
  };
  const next = [item, ...list];
  write(next);
  return item;
}

export function deleteAnamnesis(id) {
  const list = read();
  const next = list.filter((a) => a.id !== id);
  write(next);
}
