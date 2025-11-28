const KEY = "lusso_workorders_v1";

// Flujo ordenado de producción
const STATUS_FLOW = ["TO_PREPARE", "SENT_TO_LAB", "READY", "DELIVERED"];

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function normalizeStatus(status) {
  const allowed = ["TO_PREPARE", "SENT_TO_LAB", "READY", "DELIVERED", "CANCELLED"];
  return allowed.includes(status) ? status : "TO_PREPARE";
}

function toISODate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
}

function normalize(item) {
  const base = item && typeof item === "object" ? item : {};
  const createdAt = base.createdAt || new Date().toISOString();
  return {
    id: base.id,
    patientId: base.patientId ?? null,
    saleId: base.saleId ?? null,
    saleItemId: base.saleItemId ?? null,
    type: base.type || "OTRO",
    labName: base.labName || "",
    rxNotes: base.rxNotes || "", // Aquí viene el JSON de la Rx
    status: normalizeStatus(base.status),
    createdAt,
    updatedAt: base.updatedAt || createdAt,
    dueDate: toISODate(base.dueDate) || null,
  };
}

export function getAllWorkOrders() {
  return read().map(normalize);
}

export function getWorkOrdersByPatientId(patientId) {
  if (!patientId) return [];
  return read().filter((w) => w.patientId === patientId).map(normalize);
}

export function getWorkOrderById(id) {
  return read().find(w => w.id === id);
}

export function createWorkOrder(payload) {
  if (!payload?.patientId) throw new Error("patientId es requerido");
  const list = read();
  const now = new Date().toISOString();
  const workOrder = normalize({
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    ...payload,
    status: "TO_PREPARE",
    createdAt: now,
    updatedAt: now,
  });
  write([workOrder, ...list]);
  return workOrder;
}

export function updateWorkOrder(id, patch) {
  const list = read();
  let updated = null;
  const now = new Date().toISOString();
  const next = list.map((item) => {
    if (item.id !== id) return item;
    updated = normalize({ ...item, ...patch, updatedAt: now });
    return updated;
  });
  if (!updated) return null;
  write(next);
  return updated;
}

export function deleteWorkOrder(id) {
  const list = read();
  write(list.filter((w) => w.id !== id));
}

// --- LÓGICA DE FLUJO ---

export function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1) return STATUS_FLOW[0]; // Si es cancelado o inválido, reinicia
  if (idx >= STATUS_FLOW.length - 1) return STATUS_FLOW[idx]; // Tope final
  return STATUS_FLOW[idx + 1];
}

// NUEVO: Para poder corregir errores
export function prevStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx <= 0) return STATUS_FLOW[0]; // Tope inicial
  return STATUS_FLOW[idx - 1];
}
