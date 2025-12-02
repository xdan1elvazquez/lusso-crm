const KEY = "lusso_consultations_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

// Helper para estructuras vacías con soporte de archivos
const emptyEyeData = { lids: "", conjunctiva: "", cornea: "", chamber: "", iris: "", lens: "", files: [] };
const emptyFundusData = { vitreous: "", nerve: "", macula: "", vessels: "", retinaPeriphery: "", files: [] };
const emptyPio = { od: "", os: "", time: "", meds: "" };

function normalizeConsultation(raw) {
  const base = raw || {};
  const createdAt = base.createdAt || new Date().toISOString();

  // Migración de datos antiguos (retro-compatibilidad)
  const oldExam = base.exam || {};
  const anteriorNotes = [ oldExam.adnexa, oldExam.conjunctiva, oldExam.cornea ].filter(Boolean).join(". ");
  const posteriorNotes = [ oldExam.vitreous, oldExam.retina ].filter(Boolean).join(". ");

  return {
    id: base.id,
    patientId: base.patientId,
    visitDate: base.visitDate || createdAt,
    type: base.type || "OPHTHALMO",
    
    reason: base.reason || "",
    history: base.history || "",
    
    // 👈 NUEVO: Interrogatorio por Aparatos y Sistemas (IPAS)
    systemsReview: base.systemsReview || {}, 

    vitalSigns: { 
        sys: base.vitalSigns?.sys || "", dia: base.vitalSigns?.dia || "", 
        heartRate: base.vitalSigns?.heartRate || "", temp: base.vitalSigns?.temp || "" 
    },

    exam: {
        anterior: {
            od: { ...emptyEyeData, ...(base.exam?.anterior?.od || {}) },
            os: { ...emptyEyeData, ...(base.exam?.anterior?.os || {}) },
            notes: base.exam?.anterior?.notes || anteriorNotes || ""
        },
        tonometry: { ...emptyPio, ...(base.exam?.tonometry || {}) },
        posterior: {
            od: { ...emptyFundusData, ...(base.exam?.posterior?.od || {}) },
            os: { ...emptyFundusData, ...(base.exam?.posterior?.os || {}) },
            notes: base.exam?.posterior?.notes || posteriorNotes || ""
        },
        motility: base.exam?.motility || oldExam.motility || "",
        gonioscopy: base.exam?.gonioscopy || ""
    },

    diagnosis: base.diagnosis || "",
    treatment: base.treatment || "",
    prescribedMeds: Array.isArray(base.prescribedMeds) ? base.prescribedMeds : [],
    prognosis: base.prognosis || "",
    notes: base.notes || "",
    rx: base.rx || {},
    createdAt,
    updatedAt: new Date().toISOString()
  };
}

export function getAllConsultations() {
  return read().map(normalizeConsultation).sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
}

export function getConsultationsByPatient(patientId) {
  if (!patientId) return [];
  return getAllConsultations().filter(c => c.patientId === patientId);
}

export function getConsultationById(id) {
  if (!id) return null;
  const found = read().find(c => c.id === id);
  return found ? normalizeConsultation(found) : null;
}

export function createConsultation(payload) {
  const list = read();
  const newC = normalizeConsultation({
    id: crypto.randomUUID(),
    ...payload,
    createdAt: new Date().toISOString()
  });
  write([newC, ...list]);
  return newC;
}

export function updateConsultation(id, payload) {
  const list = read();
  const next = list.map(c => c.id === id ? normalizeConsultation({ ...c, ...payload }) : c);
  write(next);
}

export function deleteConsultation(id) {
  write(read().filter(c => c.id !== id));
}