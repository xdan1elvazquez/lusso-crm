const KEY = "lusso_workorders_v1";
const STATUS_FLOW = ["TO_PREPARE", "SENT_TO_LAB", "READY", "DELIVERED"];

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

function normalizeStatus(status) {
  const allowed = ["TO_PREPARE", "SENT_TO_LAB", "READY", "DELIVERED", "CANCELLED", "WARRANTY"];
  return allowed.includes(status) ? status : "TO_PREPARE";
}

function toISODate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
}

function normalize(item) {
  const base = item || {};
  return {
    id: base.id,
    patientId: base.patientId ?? null,
    saleId: base.saleId ?? null,
    saleItemId: base.saleItemId ?? null,
    type: base.type || "OTRO",
    
    // DATOS DE LABORATORIO Y COSTOS
    labId: base.labId || "",        
    labName: base.labName || "",    
    labCost: Number(base.labCost) || 0, 
    
    // GARANTÍAS
    isWarranty: Boolean(base.isWarranty),
    warrantyHistory: Array.isArray(base.warrantyHistory) ? base.warrantyHistory : [], 

    rxNotes: base.rxNotes || "",
    status: normalizeStatus(base.status),
    createdAt: base.createdAt || new Date().toISOString(),
    updatedAt: base.updatedAt || new Date().toISOString(),
    dueDate: toISODate(base.dueDate) || null,
  };
}

export function getAllWorkOrders() { return read().map(normalize); }
export function getWorkOrdersByPatientId(id) { return getAllWorkOrders().filter(w => w.patientId === id); }
export function getWorkOrderById(id) { return read().find(w => w.id === id); }

export function createWorkOrder(payload) {
  const list = read();
  const wo = normalize({
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    ...payload,
    status: "TO_PREPARE",
    createdAt: new Date().toISOString()
  });
  write([wo, ...list]);
  return wo;
}

export function updateWorkOrder(id, patch) {
  const list = read();
  let updated = null;
  const now = new Date().toISOString();
  const next = list.map(w => {
    if (w.id !== id) return w;
    updated = normalize({ ...w, ...patch, updatedAt: now });
    return updated;
  });
  if (!updated) return null;
  write(next);
  return updated;
}

export function deleteWorkOrder(id) { write(read().filter(w => w.id !== id)); }

export function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1) return STATUS_FLOW[0];
  if (idx >= STATUS_FLOW.length - 1) return STATUS_FLOW[idx];
  return STATUS_FLOW[idx + 1];
}

export function prevStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx <= 0) return STATUS_FLOW[0];
  return STATUS_FLOW[idx - 1];
}

// APLICAR GARANTÍA
export function applyWarranty(id, reason, extraCost) {
  const list = read();
  const next = list.map(w => {
    if (w.id !== id) return w;
    const event = {
      date: new Date().toISOString(),
      reason,
      cost: Number(extraCost) || 0
    };
    return normalize({
      ...w,
      status: "TO_PREPARE", // Regresa al inicio
      isWarranty: true,
      labCost: (Number(w.labCost) || 0) + event.cost, // Suma costo
      warrantyHistory: [...(w.warrantyHistory || []), event]
    });
  });
  write(next);
}