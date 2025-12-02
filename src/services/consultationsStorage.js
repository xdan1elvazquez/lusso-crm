import { logAuditAction } from "./auditStorage"; 

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

  // Migración de datos antiguos
  const oldExam = base.exam || {};
  const anteriorNotes = [ oldExam.adnexa, oldExam.conjunctiva, oldExam.cornea ].filter(Boolean).join(". ");
  const posteriorNotes = [ oldExam.vitreous, oldExam.retina ].filter(Boolean).join(". ");

  return {
    id: base.id,
    patientId: base.patientId,
    visitDate: base.visitDate || createdAt,
    type: base.type || "OPHTHALMO",
    
    // CAMPOS DE AUDITORÍA Y CONTROL
    status: base.status || "ACTIVE", // ACTIVE | VOIDED
    version: Number(base.version) || 1,

    reason: base.reason || "",
    history: base.history || "",
    
    // Interrogatorio por Aparatos y Sistemas (IPAS)
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
    updatedAt: base.updatedAt || new Date().toISOString()
  };
}

export function getAllConsultations() {
  return read()
    .map(normalizeConsultation)
    .filter(c => c.status !== "VOIDED") // 👈 FILTRO DE SEGURIDAD: Solo activos
    .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
}

export function getConsultationsByPatient(patientId) {
  if (!patientId) return [];
  // Reutiliza getAllConsultations, por lo que ya trae el filtro de VOIDED
  return getAllConsultations().filter(c => c.patientId === patientId);
}

export function getConsultationById(id) {
  if (!id) return null;
  const found = read().find(c => c.id === id);
  // Permitimos leer anulados por ID directo (para auditoría), pero normalizamos
  return found ? normalizeConsultation(found) : null;
}

export function createConsultation(payload) {
  const list = read();
  const newId = crypto.randomUUID();
  
  const newC = normalizeConsultation({
    id: newId,
    ...payload,
    createdAt: new Date().toISOString(),
    version: 1,
    status: "ACTIVE"
  });
  
  write([newC, ...list]);

  // LOG DE CREACIÓN
  logAuditAction({
      entityType: "CONSULTATION",
      entityId: newId,
      action: "CREATE",
      version: 1,
      previousState: null,
      reason: "Consulta inicial",
      user: "Sistema"
  });

  return newC;
}

export function updateConsultation(id, payload, reason = "", user = "Usuario") {
  const list = read();
  const index = list.findIndex(c => c.id === id);
  if (index === -1) return null;

  const current = list[index];
  const nextVersion = (current.version || 1) + 1;

  // 1. LOG PREVIO AL CAMBIO (SNAPSHOT)
  logAuditAction({
      entityType: "CONSULTATION",
      entityId: id,
      action: "UPDATE",
      version: nextVersion,
      previousState: current,
      reason: reason || "Edición de expediente",
      user
  });

  // 2. APLICAR CAMBIOS
  const updated = normalizeConsultation({ 
      ...current, 
      ...payload, 
      version: nextVersion,
      updatedAt: new Date().toISOString() 
  });

  list[index] = updated;
  write(list);
  return updated;
}

export function deleteConsultation(id, reason = "", user = "Usuario") {
  const list = read();
  const index = list.findIndex(c => c.id === id);
  if (index === -1) return;

  const current = list[index];

  // SOFT DELETE: MARCAR COMO VOIDED
  list[index] = { 
      ...current, 
      status: "VOIDED", 
      updatedAt: new Date().toISOString() 
  };
  
  write(list);

  // LOG DE ANULACIÓN
  logAuditAction({
      entityType: "CONSULTATION",
      entityId: id,
      action: "VOID",
      version: current.version, // Se anula la versión actual
      previousState: current,
      reason: reason || "Anulación de registro",
      user
  });
}