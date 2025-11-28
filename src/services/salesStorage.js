import { createWorkOrder, getAllWorkOrders } from "./workOrdersStorage";
import { adjustStock } from "./inventoryStorage";

const KEY = "lusso_sales_v1";
const LAB_KINDS = new Set(["LENSES", "CONTACT_LENS"]);

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

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
  const base = item && typeof item === "object" ? item : {};
  const kind = base.kind || mapLegacyCategoryToKind(base.category || saleFallback?.category || saleFallback?.kind);
  const description = base.description || saleFallback?.description || "";
  const requiresLab = LAB_KINDS.has(kind) || Boolean(base.requiresLab);

  return {
    id: base.id ?? globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    kind,
    description,
    qty: Number(base.qty) || 1,
    unitPrice: Number(base.unitPrice) || Number(saleFallback?.total) || 0,
    requiresLab,
    consultationId: base.consultationId ?? saleFallback?.consultationId ?? null,
    eyeExamId: base.eyeExamId ?? null,
    inventoryProductId: base.inventoryProductId ?? null,
    rxSnapshot: base.rxSnapshot ?? null,
    labName: base.labName || "",
    dueDate: base.dueDate || null,
  };
}

// --- NUEVO: NORMALIZAR PAGO PARA INCLUIR DETALLES DE TARJETA ---
function normalizePayment(p, defaultDate) {
  return {
    id: p.id ?? globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    amount: Number(p.amount) || 0,
    method: p.method || "EFECTIVO",
    paidAt: p.paidAt || defaultDate,
    
    // Campos extra para tarjeta
    cardType: p.cardType || null, // TDD, TDC
    terminal: p.terminal || null, // Nombre o ID de la terminal
    installments: p.installments || null, // Meses
    feeAmount: Number(p.feeAmount) || 0 // Gasto por comisión calculado
  };
}

function normalizeSale(raw) {
  const sale = raw && typeof raw === "object" ? raw : {};
  const items = (Array.isArray(raw.items) ? raw.items : [raw]).map(i => normalizeItem(i, raw));
  const itemsTotal = items.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0);
  const total = !Number.isNaN(Number(sale.total)) && Number(sale.total) > 0 ? Number(sale.total) : itemsTotal;
  const defaultDate = sale.createdAt || new Date().toISOString();

  const payments = (Array.isArray(sale.payments) ? sale.payments : []).map(p => normalizePayment(p, defaultDate));
  
  return {
    id: sale.id,
    patientId: sale.patientId ?? null,
    kind: sale.kind || items[0]?.kind || "OTHER",
    description: sale.description || items[0]?.description || "",
    total,
    items,
    payments,
    createdAt: defaultDate,
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

export function getSalesByPatientId(patientId) {
  if (!patientId) return [];
  return read().filter((s) => s.patientId === patientId).map((s) => withDerived(normalizeSale(s)));
}

function ensureWorkOrdersForSale(sale) {
  const existing = getAllWorkOrders();
  const existingKeys = new Set(existing.map((w) => `${w.saleId}::${w.saleItemId}`));
  sale.items.forEach((item) => {
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
  if (!payload?.patientId) throw new Error("patientId es requerido");
  const list = read();
  const now = new Date().toISOString();

  // Procesamos pagos para calcular comisiones si es necesario
  const processedPayments = (payload.payments || []).map(p => normalizePayment(p, now));

  const normalizedSale = normalizeSale({
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    ...payload,
    payments: processedPayments,
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
  if (!saleId) return null;
  const list = read();
  let updated = null;
  const next = list.map((s) => {
    if (s.id !== saleId) return s;
    const normalized = normalizeSale(s);
    const derived = withDerived(normalized);
    const amount = Math.min(Number(payment?.amount) || 0, Math.max(derived.balance, 0));
    if (amount <= 0) return normalized;
    
    const newPayment = normalizePayment({
      ...payment,
      amount, // Aseguramos monto correcto
      paidAt: new Date().toISOString()
    });
    
    const nextSale = { ...normalized, payments: [...normalized.payments, newPayment] };
    updated = withDerived(nextSale);
    return nextSale;
  });
  if(updated) write(next);
  return updated;
}

export function deleteSale(id) {
  const list = read();
  write(list.filter((s) => s.id !== id));
}

// --- REPORTE FINANCIERO CON COMISIONES ---
export function getFinancialReport() {
  const sales = getAllSales();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);

  let incomeToday = 0;
  let incomeMonth = 0;
  let salesToday = 0;
  let salesMonth = 0;
  let totalReceivable = 0;
  let totalFees = 0; // Nuevo: Total gastado en comisiones del mes
  
  const incomeByMethod = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, OTRO: 0 };

  sales.forEach(sale => {
    const saleDate = sale.createdAt.slice(0, 10);
    const saleMonth = sale.createdAt.slice(0, 7);

    if (saleDate === todayStr) salesToday += sale.total;
    if (saleMonth === monthStr) salesMonth += sale.total;
    if (sale.balance > 0) totalReceivable += sale.balance;

    sale.payments.forEach(pay => {
      const payDate = pay.paidAt.slice(0, 10);
      const payMonth = pay.paidAt.slice(0, 7);
      
      if (payDate === todayStr) incomeToday += pay.amount;
      if (payMonth === monthStr) {
        incomeMonth += pay.amount;
        const method = (pay.method || "OTRO").toUpperCase();
        incomeByMethod[method] = (incomeByMethod[method] || 0) + pay.amount;
        
        // Sumar comisiones del mes
        if (pay.feeAmount) totalFees += pay.feeAmount;
      }
    });
  });

  return { incomeToday, incomeMonth, salesToday, salesMonth, totalReceivable, incomeByMethod, totalFees };
}