import { createWorkOrder, getAllWorkOrders } from "./workOrdersStorage";

const KEY = "lusso_sales_v1";

const LAB_KINDS = new Set(["LENSES", "CONTACT_LENS"]);

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

function mapLegacyCategoryToKind(category) {
  switch ((category || "").toUpperCase()) {
    case "LENTES":
      return "LENSES";
    case "LC":
    case "CONTACT_LENS":
    case "CONTACTLENS":
      return "CONTACT_LENS";
    case "MEDICAMENTO":
    case "MEDICATION":
      return "MEDICATION";
    case "ACCESORIO":
    case "ACCESSORY":
      return "ACCESSORY";
    case "CONSULTA":
    case "CONSULTATION":
      return "CONSULTATION";
    default:
      return "OTHER";
  }
}

function normalizeItem(item, saleFallback) {
  const base = item && typeof item === "object" ? item : {};
  const kind = base.kind || mapLegacyCategoryToKind(base.category || saleFallback?.category || saleFallback?.kind);
  const qty = Number(base.qty) || 1;
  const unitPrice = Number(base.unitPrice) || Number(saleFallback?.total) || 0;
  const description = base.description || saleFallback?.description || "";
  const requiresLab = LAB_KINDS.has(kind) || Boolean(base.requiresLab);

  return {
    id: base.id ?? globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    kind,
    description,
    qty,
    unitPrice,
    requiresLab,
    consultationId: base.consultationId ?? saleFallback?.consultationId ?? null,
    // NUEVO: Vínculo con el examen específico
    eyeExamId: base.eyeExamId ?? null,
    rxSnapshot: base.rxSnapshot ?? null,
    labName: base.labName || "",
    dueDate: base.dueDate || null,
  };
}

function sumItems(items) {
  return items.reduce((acc, it) => acc + (Number(it.qty) || 1) * (Number(it.unitPrice) || 0), 0);
}

function normalizeItems(rawSale) {
  if (Array.isArray(rawSale?.items) && rawSale.items.length > 0) {
    return rawSale.items.map((i) => normalizeItem(i, rawSale));
  }
  return [
    normalizeItem(
      {
        kind: rawSale?.kind || mapLegacyCategoryToKind(rawSale?.category),
        description: rawSale?.description,
        qty: 1,
        unitPrice: rawSale?.total ?? 0,
        requiresLab: LAB_KINDS.has(rawSale?.kind) || LAB_KINDS.has(mapLegacyCategoryToKind(rawSale?.category)),
        consultationId: rawSale?.consultationId,
        eyeExamId: rawSale?.eyeExamId,
      },
      rawSale
    ),
  ];
}

function normalizeSale(raw) {
  const sale = raw && typeof raw === "object" ? raw : {};
  const items = normalizeItems(sale);
  const payments = Array.isArray(sale.payments) ? sale.payments : [];
  const cleanPayments = payments.map((p) => ({
    id: p?.id ?? globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    amount: Number(p?.amount) || 0,
    method: p?.method || "",
    paidAt: p?.paidAt || sale.createdAt || new Date().toISOString(),
  }));
  const itemsTotal = sumItems(items);
  const totalRaw = Number(sale.total);
  const total = !Number.isNaN(totalRaw) && totalRaw > 0 ? totalRaw : itemsTotal;
  const firstKind = items[0]?.kind || "OTHER";

  return {
    id: sale.id,
    patientId: sale.patientId ?? null,
    consultationId: sale.consultationId ?? null,
    kind: sale.kind || firstKind,
    description: sale.description || "",
    total,
    items,
    payments: cleanPayments,
    createdAt: sale.createdAt || new Date().toISOString(),
  };
}

function withDerived(sale) {
  const paidAmount = sale.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const balance = Math.max(sale.total - paidAmount, 0);
  const status = balance > 0 ? "PENDING" : "PAID";
  return { ...sale, paidAmount, balance, status };
}

export function getAllSales() {
  return read().map((s) => withDerived(normalizeSale(s)));
}

export function getSaleById(id) {
  if (!id) return null;
  const found = read().find((s) => s.id === id);
  return found ? withDerived(normalizeSale(found)) : null;
}

export function getSalesByPatientId(patientId) {
  if (!patientId) return [];
  return read()
    .filter((s) => s.patientId === patientId)
    .map((s) => withDerived(normalizeSale(s)));
}

function ensureWorkOrdersForSale(sale) {
  const existing = getAllWorkOrders();
  const existingKeys = new Set(
    existing
      .filter((w) => w.saleId === sale.id)
      .map((w) => `${w.saleId || ""}::${w.saleItemId || ""}`)
  );

  sale.items
    .filter((item) => item.requiresLab)
    .forEach((item) => {
      const key = `${sale.id || ""}::${item.id}`;
      if (existingKeys.has(key)) return;
      const rxNotes =
        item.rxSnapshot && typeof item.rxSnapshot === "object"
          ? JSON.stringify(item.rxSnapshot)
          : item.rxSnapshot || "";
      createWorkOrder({
        patientId: sale.patientId,
        saleId: sale.id,
        saleItemId: item.id,
        type: item.kind === "CONTACT_LENS" ? "LC" : item.kind === "LENSES" ? "LENTES" : "OTRO",
        status: "TO_PREPARE",
        labName: item.labName || "",
        rxNotes,
        dueDate: item.dueDate || null,
        createdAt: sale.createdAt,
      });
    });
}

export function createSale(payload) {
  if (!payload?.patientId) throw new Error("patientId es requerido");
  const list = read();
  const now = new Date().toISOString();
  const payments = Array.isArray(payload.payments) ? payload.payments : [];

  const itemsFromPayload =
    Array.isArray(payload.items) && payload.items.length
      ? payload.items
      : [
          {
            kind: payload.kind || payload.category || "OTHER",
            description: payload.description,
            qty: payload.qty ?? 1,
            unitPrice: payload.total ?? 0,
            requiresLab: LAB_KINDS.has(payload.kind || payload.category),
            consultationId: payload.consultationId ?? null,
            eyeExamId: payload.eyeExamId ?? null, // Captura el ID si viene en el payload plano
            rxSnapshot: payload.rxSnapshot || payload.rxNotes || "",
            labName: payload.labName || "",
            dueDate: payload.dueDate || null,
          },
        ];

  const normalizedSale = normalizeSale({
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    patientId: payload.patientId,
    consultationId: payload.consultationId ?? null,
    kind: payload.kind || mapLegacyCategoryToKind(payload.category),
    category: payload.category || payload.kind,
    description: payload.description?.trim?.() || "",
    total: Number(payload.total) || 0,
    payments,
    createdAt: now,
    items: itemsFromPayload,
  });

  const next = [normalizedSale, ...list];
  write(next);
  ensureWorkOrdersForSale(normalizedSale);
  return withDerived(normalizedSale);
}

export function addPaymentToSale(saleId, payment) {
  if (!saleId) return null;
  const list = read();
  let updated = null;
  const next = list.map((s) => {
    if (s.id !== saleId) return s;
    const normalized = normalizeSale(s);
    const derived = withDerived(normalized);
    const remaining = derived.balance;
    const amount = Math.min(Number(payment?.amount) || 0, Math.max(remaining, 0));
    if (amount <= 0) {
      updated = withDerived(normalized);
      return normalized;
    }
    const pay = {
      id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
      amount,
      method: payment?.method || "",
      paidAt: payment?.paidAt || new Date().toISOString(),
    };
    const nextSale = {
      ...normalized,
      payments: [...normalized.payments, pay],
    };
    updated = withDerived(nextSale);
    return nextSale;
  });
  if (!updated) return null;
  write(next);
  return updated;
}

export function deleteSale(id) {
  const list = read();
  const next = list.filter((s) => s.id !== id);
  write(next);
}