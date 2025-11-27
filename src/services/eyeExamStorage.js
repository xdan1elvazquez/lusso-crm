import { normalizeRxValue } from "@/utils/rxOptions";

const KEY = "lusso_eye_exams_v1";

// Normaliza los datos para evitar errores si falta información
function normalizeExam(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  const createdAt = base.createdAt || new Date().toISOString();
  return {
    id: base.id,
    patientId: base.patientId ?? null,
    consultationId: base.consultationId ?? null, // El vínculo clave con la consulta
    examDate: base.examDate || createdAt,
    // Aquí vive la Rx separada
    rx: normalizeRxValue(base.rx),
    // Notas específicas de la refracción (ej: "Paciente refiere mareo con cilindro alto")
    notes: base.notes || "",
    createdAt,
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeExam) : [];
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// --- API Pública ---

export function getExamsByPatient(patientId) {
  if (!patientId) return [];
  // Ordenamos del más reciente al más antiguo
  return read()
    .filter((e) => e.patientId === patientId)
    .sort((a, b) => new Date(b.examDate) - new Date(a.examDate));
}

export function getExamsByConsultation(consultationId) {
  if (!consultationId) return [];
  return read().filter((e) => e.consultationId === consultationId);
}

export function createEyeExam(payload) {
  if (!payload.patientId) throw new Error("Patient ID requerido");
  
  const list = read();
  const now = new Date().toISOString();
  
  const newExam = normalizeExam({
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    ...payload,
    createdAt: now,
  });

  write([newExam, ...list]);
  return newExam;
}

export function deleteEyeExam(id) {
  const list = read();
  const next = list.filter((e) => e.id !== id);
  write(next);
}