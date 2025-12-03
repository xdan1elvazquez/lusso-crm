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

// Helpers
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

  // 👈 Compatibilidad con diagnósticos múltiples
  let diagnoses = Array.isArray(base.diagnoses) ? base.diagnoses : [];

  return {
    id: base.id,
    patientId: base.patientId,
    visitDate: base.visitDate || createdAt,
    type: base.type || "OPHTHALMO",
    
    // --- AUDITORÍA (MANTENIDO) ---
    status: base.status || "ACTIVE",
    version: Number(base.version) || 1,

    // --- SEGURIDAD Y NOTAS ADICIONALES (NUEVO) ---
    forceUnlock: Boolean(base.forceUnlock), // Permiso temporal de edición
    addendums: Array.isArray(base.addendums) ? base.addendums : [], // Notas posteriores

    reason: base.reason || "",
    history: base.history || "",
    
    // --- IPAS (MANTENIDO) ---
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

    // 👈 NUEVOS CAMPOS (CIE-10 e INTERCONSULTA)
    diagnoses: diagnoses, // Array [{ code, name, type }]
    diagnosis: base.diagnosis || "", // Texto libre (legacy backup)
    
    interconsultation: {
        required: base.interconsultation?.required || false,
        to: base.interconsultation?.to || "", 
        reason: base.interconsultation?.reason || "",
        urgency: base.interconsultation?.urgency || "NORMAL", 
        status: base.interconsultation?.status || "PENDING", 
        createdAt: base.interconsultation?.createdAt || null
    },

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
    .filter(c => c.status !== "VOIDED") // Filtro auditoría activo
    .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
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
  const newId = crypto.randomUUID();
  const newC = normalizeConsultation({
    id: newId,
    ...payload,
    createdAt: new Date().toISOString(),
    version: 1,
    status: "ACTIVE"
  });
  write([newC, ...list]);
  logAuditAction({ entityType: "CONSULTATION", entityId: newId, action: "CREATE", version: 1, previousState: null, reason: "Consulta inicial", user: "Sistema" });
  return newC;
}

export function updateConsultation(id, payload, reason = "", user = "Usuario") {
  const list = read();
  const index = list.findIndex(c => c.id === id);
  if (index === -1) throw new Error("Consulta no encontrada");
  
  const current = list[index];

  // --- REGLA DE NEGOCIO: BLOQUEO 24H ---
  const createdTime = new Date(current.createdAt).getTime();
  const now = Date.now();
  const hoursDiff = (now - createdTime) / (1000 * 60 * 60);

  // Si pasaron más de 24h Y no tiene permiso explícito
  if (hoursDiff > 24 && !current.forceUnlock) {
      throw new Error("⛔ CONSULTA CERRADA: Han pasado más de 24 horas. No se permite editar el contenido original. Usa 'Nota Adicional'.");
  }
  // --------------------------------------

  const nextVersion = (current.version || 1) + 1;
  
  logAuditAction({ entityType: "CONSULTATION", entityId: id, action: "UPDATE", version: nextVersion, previousState: current, reason: reason || "Edición", user });
  
  // Mantenemos forceUnlock si ya estaba activo, o lo reseteamos si quisieras que el permiso sea de un solo uso.
  // Por ahora lo mantenemos activo para permitir correcciones continuas una vez desbloqueado.
  const updated = normalizeConsultation({ ...current, ...payload, version: nextVersion, updatedAt: new Date().toISOString() });
  list[index] = updated;
  write(list);
  return updated;
}

// --- NUEVA FUNCIÓN: Agregar Nota Adicional (Addendum) ---
export function addConsultationAddendum(id, text, user = "Usuario") {
    const list = read();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Consulta no encontrada");

    const current = list[index];
    const newAddendum = {
        id: crypto.randomUUID(),
        text,
        createdAt: new Date().toISOString(),
        createdBy: user
    };

    const updated = { ...current, addendums: [...(current.addendums || []), newAddendum] };
    list[index] = updated;
    write(list);

    logAuditAction({ 
        entityType: "CONSULTATION", 
        entityId: id, 
        action: "ADDENDUM_CREATED", 
        version: current.version, 
        reason: "Nota Adicional", 
        user 
    });

    return updated;
}

// --- NUEVA FUNCIÓN: Desbloqueo Administrativo ---
export function unlockConsultation(id, reason, user = "Gerente") {
    const list = read();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Consulta no encontrada");

    const current = list[index];
    
    // Activamos el flag forceUnlock
    const updated = { ...current, forceUnlock: true };
    list[index] = updated;
    write(list);

    logAuditAction({ 
        entityType: "CONSULTATION", 
        entityId: id, 
        action: "CONSULTATION_UNLOCKED", 
        version: current.version, 
        reason: reason || "Desbloqueo administrativo", 
        user 
    });
    
    return updated;
}

export function deleteConsultation(id, reason = "", user = "Usuario") {
  const list = read();
  const index = list.findIndex(c => c.id === id);
  if (index === -1) return;
  const current = list[index];
  
  list[index] = { ...current, status: "VOIDED", updatedAt: new Date().toISOString() };
  write(list);
  
  logAuditAction({ entityType: "CONSULTATION", entityId: id, action: "VOID", version: current.version, previousState: current, reason: reason || "Anulación", user });
}