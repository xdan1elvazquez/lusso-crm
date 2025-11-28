import { normalizeRxValue } from "@/utils/rxOptions";

const KEY = "lusso_eye_exams_v1";

// Normalizador robusto para evitar errores si faltan datos nuevos
function normalizeExam(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  const createdAt = base.createdAt || new Date().toISOString();
  
  return {
    id: base.id,
    patientId: base.patientId ?? null,
    consultationId: base.consultationId ?? null,
    examDate: base.examDate || createdAt,
    
    // --- SECCIÓN 1: PRELIMINARES Y SALUD (NOM-004) ---
    preliminary: {
      avsc: { 
        od: base.preliminary?.avsc?.od || "", 
        oi: base.preliminary?.avsc?.oi || "" 
      },
      avcc: { 
        od: base.preliminary?.avcc?.od || "", 
        oi: base.preliminary?.avcc?.oi || "" 
      },
      autorefrac: { 
        od: base.preliminary?.autorefrac?.od || "", 
        oi: base.preliminary?.autorefrac?.oi || "" 
      },
      lensometry: normalizeRxValue(base.preliminary?.lensometry),
    },

    triage: {
      iop: { 
        od: base.triage?.iop?.od || "", 
        oi: base.triage?.iop?.oi || "" 
      },
      ishihara: base.triage?.ishihara || "", 
    },

    // --- SECCIÓN 2: REFRACCIÓN FINAL (LENTES) ---
    rx: normalizeRxValue(base.rx),

    // --- SECCIÓN 3: RECOMENDACIÓN ÓPTICA (El "Bridge" a Ventas) ---
    recommendations: {
      design: base.recommendations?.design || "",   // Ej. Progresivo, Monofocal
      material: base.recommendations?.material || "", // Ej. Poly, High Index
      coating: base.recommendations?.coating || "",   // Ej. Antireflejante, Blue Ray
      usage: base.recommendations?.usage || "",       // Ej. Uso permanente, Lectura
    },

    // --- SECCIÓN 4: LENTES DE CONTACTO (CL) ---
    contactLens: {
      design: base.contactLens?.design || "", 
      brand: base.contactLens?.brand || "",
      od: {
        baseCurve: base.contactLens?.od?.baseCurve || "",
        diameter: base.contactLens?.od?.diameter || "",
        power: base.contactLens?.od?.power || "", 
      },
      oi: {
        baseCurve: base.contactLens?.oi?.baseCurve || "",
        diameter: base.contactLens?.oi?.diameter || "",
        power: base.contactLens?.oi?.power || "",
      }
    },

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
  return read()
    .filter((e) => e.patientId === patientId)
    .sort((a, b) => new Date(b.examDate) - new Date(a.examDate));
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