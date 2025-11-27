const KEY = "lusso_workorders_v1";

const STATUS_FLOW = ["TO_PREPARE", "SENT_TO_LAB", "READY", "DELIVERED"];

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime?.())) return value.toISOString();
  return null;
}

function normalize(item) {
  const base = item && typeof item === "object" ? item : {};
  const createdAt = base.createdAt || new Date().toISOString();
  return {
    id: base.id,
    patientId: base.patientId ?? null,
    saleId: base.saleId ?? null,
    type: base.type || "OTRO",
    labName: base.labName || "",
    rxNotes: base.rxNotes || "",
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
  return read()
    .filter((w) => w.patientId === patientId)
    .map(normalize);
}

export function createWorkOrder(payload) {
  if (!payload?.patientId) throw new Error("patientId es requerido");
  const list = read();
  const now = new Date().toISOString();
  const workOrder = normalize({
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    patientId: payload.patientId,
    saleId: payload.saleId ?? null,
    type: payload.type || "OTRO",
    labName: payload.labName?.trim?.() || "",
    rxNotes: payload.rxNotes?.trim?.() || "",
    status: normalizeStatus(payload.status || "TO_PREPARE"),
    createdAt: now,
    updatedAt: now,
    dueDate: toISODate(payload.dueDate),
  });
  const next = [workOrder, ...list];
  write(next);
  return workOrder;
}

export function updateWorkOrder(id, patch) {
  if (!id) return null;
  const list = read();
  let updated = null;
  const now = new Date().toISOString();
  const next = list.map((item) => {
    if (item.id !== id) return item;
    const normalized = normalize(item);
    const merged = normalize({
      ...normalized,
      ...patch,
      status: patch?.status ? normalizeStatus(patch.status) : normalized.status,
      updatedAt: now,
      dueDate: toISODate(patch?.dueDate) ?? normalized.dueDate,
    });
    updated = merged;
    return merged;
  });
  if (!updated) return null;
  write(next);
  return updated;
}

export function deleteWorkOrder(id) {
  const list = read();
  const next = list.filter((w) => w.id !== id);
  write(next);
}

export function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1) return STATUS_FLOW[0];
  if (idx >= STATUS_FLOW.length - 1) return STATUS_FLOW[idx];
  return STATUS_FLOW[idx + 1];
}
