import { createWorkOrder, getAllWorkOrders } from "./workOrdersStorage";
import { adjustStock } from "./inventoryStorage";

const KEY = "lusso_sales_v1";
const LAB_KINDS = new Set(["LENSES", "CONTACT_LENS"]);

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

function mapLegacyCategoryToKind(category) {
  switch ((category || "").toUpperCase()) {
    case "LENTES": return "LENSES";
    case "LC": return "CONTACT_LENS";
    case "MEDICAMENTO": return "MEDICATION";
    case "ACCESORIO": return "ACCESSORY";
    case "CONSULTA": return "CONSULTATION";
    default: return "OTHER";
  }
}

function normalizeItem(item, saleFallback) {
  const base = item || {};
  const kind = base.kind || mapLegacyCategoryToKind(base.category);
  return {
    id: base.id ?? crypto.randomUUID(),
    kind,
    description: base.description || "",
    qty: Number(base.qty) || 1,
    unitPrice: Number(base.unitPrice) || 0,
    requiresLab: LAB_KINDS.has(kind) || Boolean(base.requiresLab),
    consultationId: base.consultationId ?? null,
    eyeExamId: base.eyeExamId ?? null,
    inventoryProductId: base.inventoryProductId ?? null,
    taxable: base.taxable !== undefined ? Boolean(base.taxable) : true, // NUEVO
    rxSnapshot: base.rxSnapshot ?? null,
    labName: base.labName || "",
    dueDate: base.dueDate || null,
  };
}

function normalizeSale(raw) {
  const sale = raw || {};
  const items = (Array.isArray(raw.items) ? raw.items : [raw]).map(i => normalizeItem(i, raw));
  
  // Cálculos de base
  const subtotalGross = items.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0);
  const discount = Number(sale.discount) || 0;
  
  // Total final a pagar (lo que realmente cobraremos)
  let total = subtotalGross - discount;
  if (total < 0) total = 0;

  const payments = (Array.isArray(sale.payments) ? sale.payments : []);
  
  return {
    id: sale.id,
    patientId: sale.patientId ?? null,
    kind: sale.kind || items[0]?.kind || "OTHER",
    description: sale.description || items[0]?.description || "",
    
    // Finanzas
    subtotalGross, // Suma de precios de lista
    discount,      // Descuento aplicado ($)
    total,         // Total final a pagar

    items,
    payments,
    createdAt: sale.createdAt || new Date().toISOString(),
  };
}

function withDerived(sale) {
  const paidAmount = sale.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const balance = Math.max(sale.total - paidAmount, 0);
  const status = balance > 0 ? "PENDING" : "PAID";
  return { ...sale, paidAmount, balance, status };
}

export function getAllSales() { return read().map(s => withDerived(normalizeSale(s))); }

export function getSalesByPatientId(patientId) {
  if (!patientId) return [];
  return read().filter(s => s.patientId === patientId).map(s => withDerived(normalizeSale(s)));
}

function ensureWorkOrdersForSale(sale) {
  const existing = getAllWorkOrders();
  const existingKeys = new Set(existing.map(w => `${w.saleId}::${w.saleItemId}`));
  sale.items.forEach(item => {
    if (!item.requiresLab) return;
    const key = `${sale.id}::${item.id}`;
    if (existingKeys.has(key)) return;
    createWorkOrder({
      patientId: sale.patientId,
      saleId: sale.id,
      saleItemId: item.id,
      type: item.kind === "CONTACT_LENS" ? "LC" : "LENTES",
      status: "TO_PREPARE",
      labName: item.labName || "",
      rxNotes: item.rxSnapshot ? JSON.stringify(item.rxSnapshot) : "",
      dueDate: item.dueDate || null,
      createdAt: sale.createdAt,
    });
  });
}

export function createSale(payload) {
  if (!payload?.patientId) throw new Error("patientId requerido");
  const list = read();
  const now = new Date().toISOString();
  
  const normalizedSale = normalizeSale({
    id: crypto.randomUUID(),
    ...payload,
    createdAt: now,
  });

  normalizedSale.items.forEach(item => {
    if (item.inventoryProductId) adjustStock(item.inventoryProductId, -item.qty);
  });

  write([normalizedSale, ...list]);
  ensureWorkOrdersForSale(normalizedSale);
  return withDerived(normalizedSale);
}

export function addPaymentToSale(saleId, payment) {
  const list = read();
  let updated = null;
  const next = list.map(s => {
    if (s.id !== saleId) return s;
    const norm = normalizeSale(s);
    const derived = withDerived(norm);
    const amount = Math.min(Number(payment?.amount) || 0, derived.balance);
    if (amount <= 0) return norm;
    
    const newPay = { ...payment, id: crypto.randomUUID(), amount, paidAt: new Date().toISOString() };
    updated = withDerived({ ...norm, payments: [...norm.payments, newPay] });
    return updated;
  });
  if(updated) write(next);
  return updated;
}

export function deleteSale(id) {
  write(read().filter(s => s.id !== id));
}

// --- REPORTE FINANCIERO ---
export function getFinancialReport() {
  // (Se mantiene igual que la versión anterior, ya que usa 'total' que ya calculamos)
  const sales = getAllSales();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);

  let incomeToday = 0, incomeMonth = 0, salesToday = 0, salesMonth = 0, totalReceivable = 0, totalFees = 0;
  const incomeByMethod = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, OTRO: 0 };

  sales.forEach(sale => {
    const date = sale.createdAt.slice(0, 10);
    const month = sale.createdAt.slice(0, 7);
    if (date === todayStr) salesToday += sale.total;
    if (month === monthStr) salesMonth += sale.total;
    if (sale.balance > 0) totalReceivable += sale.balance;

    sale.payments.forEach(pay => {
      const pDate = pay.paidAt.slice(0, 10);
      const pMonth = pay.paidAt.slice(0, 7);
      if (pDate === todayStr) incomeToday += pay.amount;
      if (pMonth === monthStr) {
        incomeMonth += pay.amount;
        const m = (pay.method || "OTRO").toUpperCase();
        incomeByMethod[m] = (incomeByMethod[m] || 0) + pay.amount;
        if (pay.feeAmount) totalFees += pay.feeAmount;
      }
    });
  });

  return { incomeToday, incomeMonth, salesToday, salesMonth, totalReceivable, incomeByMethod, totalFees };
}