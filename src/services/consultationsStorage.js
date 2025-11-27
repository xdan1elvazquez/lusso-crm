// src/services/consultationsStorage.js
const KEY = "lusso_consultations";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

// ✅ esto es lo que te falta para el Dashboard
export function getAllConsultations() {
  return read();
}

export function getConsultationsByPatient(patientId) {
  if (!patientId) return [];
  return read().filter((c) => c.patientId === patientId);
}

export function createConsultation(data) {
  const list = read();
  const now = new Date().toISOString();
  const consultation = {
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    createdAt: now,
    patientId: data.patientId || null,
    type: data.type?.trim?.() || "",
    reason: data.reason?.trim?.() || "",
    diagnosis: data.diagnosis?.trim?.() || "",
    notes: data.notes?.trim?.() || "",
  };
  const next = [consultation, ...list];
  write(next);
  return consultation;
}

export function updateConsultation(id, patch) {
  const list = read();
  let updated = null;
  const next = list.map((item) => {
    if (item.id !== id) return item;
    updated = {
      ...item,
      patientId: patch.patientId ?? item.patientId,
      type: patch.type?.trim?.() ?? item.type,
      reason: patch.reason?.trim?.() ?? item.reason,
      diagnosis: patch.diagnosis?.trim?.() ?? item.diagnosis,
      notes: patch.notes?.trim?.() ?? item.notes,
    };
    return updated;
  });
  if (!updated) return null;
  write(next);
  return updated;
}

export function deleteConsultation(id) {
  const list = read();
  const next = list.filter((c) => c.id !== id);
  write(next);
}
