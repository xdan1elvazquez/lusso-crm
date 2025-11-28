import { createWorkOrder, getAllWorkOrders } from "./workOrdersStorage";
import { adjustStock } from "./inventoryStorage";

const KEY = "lusso_sales_v1";

const LAB_KINDS = new Set(["LENSES", "CONTACT_LENS"]);

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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
    eyeExamId: base.eyeExamId ?? null,
    inventoryProductId: base.inventoryProductId ?? null,
    rxSnapshot: base.rxSnapshot ?? null,
    labName: base.labName || "",
    dueDate: base.dueDate || null,
  };
}

function normalizeSale(raw) {
  const sale = raw && typeof raw === "object" ? raw : {};
  const items = (Array.isArray(raw.items) ? raw.items : [raw]).map(i => normalizeItem(i, raw));
  
  const itemsTotal = items.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0);
  const totalRaw = Number(sale.total);
  const total = !Number.isNaN(totalRaw) && totalRaw > 0 ? totalRaw : itemsTotal;

  const payments = Array.isArray(sale.payments) ? sale.payments : [];
  
  return {
    id: sale.id,
    patientId: sale.patientId ?? null,
    kind: sale.kind || items[0]?.kind || "OTHER",
    description: sale.description || items[0]?.description || "",
    total,
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

export function getAllSales() {
  return read().map((s) => withDerived(normalizeSale(s)));
}

export function getSalesByPatientId(patientId) {
  if (!patientId) return [];
  return read()
    .filter((s) => s.patientId === patientId)
    .map((s) => withDerived(normalizeSale(s)));
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

  const normalizedSale = normalizeSale({
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    ...payload,
    createdAt: now,
  });

  normalizedSale.items.forEach(item => {
    if (item.inventoryProductId) {
      adjustStock(item.inventoryProductId, -item.qty);
    }
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
    if (amount <= 0) return normalized;
    
    const newPayment = {
      id: crypto.randomUUID(),
      amount,
      method: payment?.method || "EFECTIVO",
      paidAt: new Date().toISOString()
    };
    
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

// --- 👇 NUEVO: REPORTE FINANCIERO AUTOMÁTICO ---
export function getFinancialReport() {
  const sales = getAllSales();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7); // YYYY-MM

  let incomeToday = 0;
  let incomeMonth = 0;
  let salesToday = 0; // Valor total vendido (aunque no esté pagado)
  let salesMonth = 0;
  let totalReceivable = 0; // Lo que te deben (Saldo pendiente)
  
  const incomeByMethod = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, OTRO: 0 };

  sales.forEach(sale => {
    const saleDate = sale.createdAt.slice(0, 10);
    const saleMonth = sale.createdAt.slice(0, 7);

    // 1. Métricas de Venta (Contratos cerrados)
    if (saleDate === todayStr) salesToday += sale.total;
    if (saleMonth === monthStr) salesMonth += sale.total;

    // 2. Cuentas por cobrar
    if (sale.balance > 0) totalReceivable += sale.balance;

    // 3. Métricas de Ingreso Real (Pagos/Abonos)
    sale.payments.forEach(pay => {
      const payDate = pay.paidAt.slice(0, 10);
      const payMonth = pay.paidAt.slice(0, 7);
      
      // Dinero que entró HOY (sin importar cuándo se vendió)
      if (payDate === todayStr) incomeToday += pay.amount;
      
      // Dinero que entró este MES
      if (payMonth === monthStr) {
        incomeMonth += pay.amount;
        // Desglose por método (del mes)
        const method = (pay.method || "OTRO").toUpperCase();
        incomeByMethod[method] = (incomeByMethod[method] || 0) + pay.amount;
      }
    });
  });

  return {
    incomeToday,
    incomeMonth,
    salesToday,
    salesMonth,
    totalReceivable,
    incomeByMethod
  };
}