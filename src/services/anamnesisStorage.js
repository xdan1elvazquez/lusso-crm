import { logAuditAction } from "./auditStorage";

const KEY = "lusso_anamnesis_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function normalizeAnamnesis(item) {
  const base = item || {};
  return {
    id: base.id,
    patientId: base.patientId,
    createdAt: base.createdAt || new Date().toISOString(),
    
    // CAMPOS DE CONTROL
    status: base.status || "ACTIVE",
    version: Number(base.version) || 1,

    // ESTRUCTURA DE PADECIMIENTOS
    systemic: base.systemic || {},       
    nonPathological: base.nonPathological || {}, 
    systemsReview: base.systemsReview || {}, 
    ocular: base.ocular || {},           
    family: base.family || {},           
    
    // Campos libres
    allergies: base.allergies || "",
    medications: base.medications || "", 
    observations: base.observations || ""
  };
}

export function getAllAnamnesis() {
  return read()
    .map(normalizeAnamnesis)
    .filter(a => a.status !== "VOIDED") // 👈 FILTRO ACTIVO
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getAnamnesisByPatientId(patientId) {
  if (!patientId) return [];
  return getAllAnamnesis().filter((a) => a.patientId === patientId);
}

export function getLastAnamnesis(patientId) {
  const list = getAnamnesisByPatientId(patientId);
  return list.length > 0 ? list[0] : null;
}

export function createAnamnesis(payload) {
  const list = read();
  const newId = crypto.randomUUID();
  
  const newEntry = normalizeAnamnesis({
    id: newId,
    ...payload,
    createdAt: new Date().toISOString(),
    version: 1,
    status: "ACTIVE"
  });
  
  write([newEntry, ...list]);

  logAuditAction({ 
      entityType: "ANAMNESIS", 
      entityId: newId, 
      action: "CREATE", 
      version: 1,
      reason: "Registro inicial",
      user: "Sistema"
  });

  return newEntry;
}

export function deleteAnamnesis(id, reason = "Borrado manual") {
  const list = read();
  const index = list.findIndex(a => a.id === id);
  if (index === -1) return;

  const current = list[index];
  
  // SOFT DELETE
  list[index] = { ...current, status: "VOIDED" };
  write(list);

  logAuditAction({
      entityType: "ANAMNESIS",
      entityId: id,
      action: "VOID",
      version: current.version || 1,
      previousState: current,
      reason
  });
}