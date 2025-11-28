import { normalizeRxValue } from "@/utils/rxOptions";

const KEY = "lusso_consultations";

function normalizeConsultation(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  const createdAt = base.createdAt || new Date().toISOString();
  const visitDate = base.visitDate || createdAt;
  
  return {
    id: base.id,
    patientId: base.patientId ?? null,
    type: base.type || "OPHTHALMO",
    
    visitDate,
    reason: base.reason?.trim() || "",
    history: base.history?.trim() || "",

    vitalSigns: {
      sys: base.vitalSigns?.sys || "",
      dia: base.vitalSigns?.dia || "",
      heartRate: base.vitalSigns?.heartRate || "",
      temp: base.vitalSigns?.temp || "",
      weight: base.vitalSigns?.weight || "",
      height: base.vitalSigns?.height || "",
    },

    exam: {
      adnexa: base.exam?.adnexa || "",
      conjunctiva: base.exam?.conjunctiva || "",
      cornea: base.exam?.cornea || "",
      anteriorChamber: base.exam?.anteriorChamber || "",
      iris: base.exam?.iris || "",
      lens: base.exam?.lens || "",
      vitreous: base.exam?.vitreous || "",
      retina: base.exam?.retina || "",
      motility: base.exam?.motility || "",
    },

    diagnosis: base.diagnosis?.trim() || "",
    treatment: base.treatment?.trim() || "",
    prognosis: base.prognosis?.trim() || "",
    
    // --- NUEVO: Lista estructurada de medicamentos para la caja ---
    // Estructura: { productId, productName, quantity, instructions }
    prescribedMeds: Array.isArray(base.prescribedMeds) ? base.prescribedMeds : [],

    notes: base.notes?.trim() || "",
    
    rx: normalizeRxValue(base.rx),
    createdAt,
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeConsultation) : [];
  } catch {
    return [];
  }
}

function write(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function getAllConsultations() {
  return read().sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
}

export function getConsultationById(id) {
  if (!id) return null;
  return read().find((c) => c.id === id) || null;
}

export function getConsultationsByPatient(patientId) {
  if (!patientId) return [];
  return read().filter((c) => c.patientId === patientId);
}

function toVisitDateISO(value, fallback) {
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`).toISOString();
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return fallback;
}

export function createConsultation(data) {
  const list = read();
  const now = new Date().toISOString();
  const consultation = normalizeConsultation({
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    ...data,
    createdAt: now,
    visitDate: toVisitDateISO(data.visitDate, now),
  });
  const next = [consultation, ...list];
  write(next);
  return consultation;
}

export function updateConsultation(id, patch) {
  const list = read();
  let updated = null;
  const next = list.map((item) => {
    if (item.id !== id) return item;
    updated = normalizeConsultation({
      ...item,
      ...patch,
      vitalSigns: { ...item.vitalSigns, ...(patch.vitalSigns || {}) },
      exam: { ...item.exam, ...(patch.exam || {}) },
      // Aseguramos que se guarden los meds si vienen en el patch
      prescribedMeds: patch.prescribedMeds || item.prescribedMeds || [],
    });
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