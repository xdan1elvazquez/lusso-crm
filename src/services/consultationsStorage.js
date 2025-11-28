import { normalizeRxValue } from "@/utils/rxOptions";

const KEY = "lusso_consultations";

function normalizeConsultation(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  const createdAt = base.createdAt || new Date().toISOString();
  const visitDate = base.visitDate || createdAt;
  
  return {
    id: base.id,
    patientId: base.patientId ?? null,
    type: base.type || "OPHTHALMO", // OPHTHALMO, GENERAL, CHECKUP
    
    // --- 1. DATOS GENERALES (NOM-004) ---
    visitDate,
    reason: base.reason?.trim() || "", // Motivo de consulta (Interrogatorio)
    history: base.history?.trim() || "", // Padecimiento actual

    // --- 2. SIGNOS VITALES (Obligatorio NOM) ---
    vitalSigns: {
      sys: base.vitalSigns?.sys || "", // Sistólica (mmHg)
      dia: base.vitalSigns?.dia || "", // Diastólica
      heartRate: base.vitalSigns?.heartRate || "", // FC
      temp: base.vitalSigns?.temp || "", // Temperatura
      weight: base.vitalSigns?.weight || "", // Peso (kg) - Opcional en oftalmo pero bueno tenerlo
      height: base.vitalSigns?.height || "", // Talla
    },

    // --- 3. EXPLORACIÓN OFTALMOLÓGICA (La parte fuerte) ---
    exam: {
      adnexa: base.exam?.adnexa || "", // Párpados, vía lagrimal, órbita
      conjunctiva: base.exam?.conjunctiva || "", // Hiperemia, pterigión
      cornea: base.exam?.cornea || "", // Transparencia, úlceras
      anteriorChamber: base.exam?.anteriorChamber || "", // Tyndall, profundidad
      iris: base.exam?.iris || "", // Pupilas, sinequias
      lens: base.exam?.lens || "", // Cristalino (Catarata)
      vitreous: base.exam?.vitreous || "", // Hialoides
      retina: base.exam?.retina || "", // Fondo de ojo, mácula, nervio óptico
      motility: base.exam?.motility || "", // Movimientos oculares (Ortotropia)
    },

    // --- 4. CONCLUSIONES ---
    diagnosis: base.diagnosis?.trim() || "", // Dx principal (CIE-10 idealmente, texto por ahora)
    treatment: base.treatment?.trim() || "", // Plan / Receta Médica
    prognosis: base.prognosis?.trim() || "", // Pronóstico (Bueno para la función visual, reservado, etc)
    
    notes: base.notes?.trim() || "", // Notas adicionales
    
    // Mantenemos Rx por compatibilidad, aunque ahora vive en EyeExam mayormente
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
    // Hacemos merge profundo de los objetos anidados para no borrar datos
    updated = normalizeConsultation({
      ...item,
      ...patch,
      vitalSigns: { ...item.vitalSigns, ...(patch.vitalSigns || {}) },
      exam: { ...item.exam, ...(patch.exam || {}) },
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