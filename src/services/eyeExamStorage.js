import { normalizeRxValue } from "@/utils/rxOptions";

const KEY = "lusso_eye_exams_v1";

const emptyAV = { od: "", os: "", ao: "" };

function normalizeExam(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  const createdAt = base.createdAt || new Date().toISOString();
  
  return {
    id: base.id,
    patientId: base.patientId ?? null,
    consultationId: base.consultationId ?? null,
    examDate: base.examDate || createdAt,
    
    preliminary: {
      avsc: { far: { ...emptyAV, ...(base.preliminary?.avsc?.far || {}) }, near: { ...emptyAV, ...(base.preliminary?.avsc?.near || {}) } },
      avcc: { far: { ...emptyAV, ...(base.preliminary?.avcc?.far || {}) }, near: { ...emptyAV, ...(base.preliminary?.avcc?.near || {}) } },
      cv: { far: { ...emptyAV, ...(base.preliminary?.cv?.far || {}) }, near: { ...emptyAV, ...(base.preliminary?.cv?.near || {}) } },
      lensometry: normalizeRxValue(base.preliminary?.lensometry),
      ishihara: base.preliminary?.ishihara || "",
      motility: base.preliminary?.motility || "",
    },

    refraction: {
      autorefrac: { od: base.refraction?.autorefrac?.od || "", os: base.refraction?.autorefrac?.os || "" },
      finalRx: normalizeRxValue(base.refraction?.finalRx || base.rx), 
      finalAv: { far: { ...emptyAV, ...(base.refraction?.finalAv?.far || {}) }, near: { ...emptyAV, ...(base.refraction?.finalAv?.near || {}) } }
    },

    contactLens: {
      keratometry: {
        od: { k1: "", k2: "", axis: "", ...base.contactLens?.keratometry?.od },
        os: { k1: "", k2: "", axis: "", ...base.contactLens?.keratometry?.os }
      },
      trial: {
        od: { baseCurve: "", diameter: "", power: "", av: "", overRefraction: "" },
        os: { baseCurve: "", diameter: "", power: "", av: "", overRefraction: "" },
        notes: base.contactLens?.trial?.notes || ""
      },
      final: {
        design: base.contactLens?.final?.design || "",
        brand: base.contactLens?.final?.brand || "",
        od: { baseCurve: "", diameter: "", power: "" },
        os: { baseCurve: "", diameter: "", power: "" }
      }
    },

    recommendations: {
      design: base.recommendations?.design || "",
      material: base.recommendations?.material || "",
      coating: base.recommendations?.coating || "",
      usage: base.recommendations?.usage || "",
    },

    notes: base.notes || "",
    rx: normalizeRxValue(base.refraction?.finalRx || base.rx), // Compatibilidad
    createdAt,
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw).map(normalizeExam) : [];
  } catch { return []; }
}

function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

export function getExamsByPatient(patientId) {
  if (!patientId) return [];
  return read().filter((e) => e.patientId === patientId).sort((a, b) => new Date(b.examDate) - new Date(a.examDate));
}

export function getExamsByConsultation(consultationId) {
  if (!consultationId) return [];
  return read().filter((e) => e.consultationId === consultationId);
}

export function getExamById(id) {
  if (!id) return null;
  return read().find((e) => e.id === id) || null;
}

export function createEyeExam(payload) {
  if (!payload.patientId) throw new Error("Patient ID requerido");
  const list = read();
  const newExam = normalizeExam({
    id: crypto.randomUUID(),
    ...payload,
    createdAt: new Date().toISOString(),
  });
  write([newExam, ...list]);
  return newExam;
}

// NUEVO: Actualizar examen
export function updateEyeExam(id, patch) {
  const list = read();
  const next = list.map(e => e.id === id ? normalizeExam({ ...e, ...patch }) : e);
  write(next);
}

export function deleteEyeExam(id) {
  write(read().filter((e) => e.id !== id));
}