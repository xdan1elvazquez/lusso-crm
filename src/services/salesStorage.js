import { createWorkOrder, getAllWorkOrders } from "./workOrdersStorage";
import { adjustStock } from "./inventoryStorage";
import { getPatientById, adjustPatientPoints } from "./patientsStorage"; 
import { getLoyaltySettings } from "./settingsStorage"; 

const KEY = "lusso_sales_v1";
const LAB_KINDS = new Set(["LENSES", "CONTACT_LENS"]);

function read() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

function mapLegacyCategoryToKind(c) { return "OTHER"; } // (Simplificado)

function normalizeItem(item, saleFallback) {
  // ... (Igual que antes) ...
  const base = item || {};
  return {
      id: base.id ?? crypto.randomUUID(),
      kind: base.kind || "OTHER",
      description: base.description || "",
      qty: Number(base.qty) || 1,
      unitPrice: Number(base.unitPrice) || 0,
      requiresLab: Boolean(base.requiresLab),
      consultationId: base.consultationId || null,
      eyeExamId: base.eyeExamId || null,
      inventoryProductId: base.inventoryProductId || null,
      rxSnapshot: base.rxSnapshot || null,
      labName: base.labName || "",
      dueDate: base.dueDate || null,
      taxable: base.taxable !== false
  };
}

// --- NUEVO: NORMALIZAR PAGO PARA INCLUIR DETALLES DE TARJETA ---
function normalizePayment(p, defaultDate) {
  return {
    id: p.id ?? crypto.randomUUID(),
    amount: Number(p.amount) || 0,
    method: p.method || "EFECTIVO",
    paidAt: p.paidAt || defaultDate,
    
    // Campos extra para tarjeta
    cardType: p.cardType || null, 
    terminal: p.terminal || null, 
    installments: p.installments || null, 
    feeAmount: Number(p.feeAmount) || 0 
  };
}

function normalizeSale(raw) {
    const sale = raw || {};
    const items = (Array.isArray(sale.items) ? sale.items : [sale]).map(i => normalizeItem(i, raw));
    const subtotalGross = items.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0);
    const discount = Number(sale.discount) || 0;
    let total = subtotalGross - discount; if(total < 0) total = 0;

    const payments = (Array.isArray(sale.payments) ? sale.payments : []).map(p => normalizePayment(p, sale.createdAt || new Date().toISOString()));

    return {
        id: sale.id,
        patientId: sale.patientId,
        kind: sale.kind || items[0]?.kind || "OTHER",
        description: sale.description || items[0]?.description || "",
        subtotalGross, discount, total,
        items, payments,
        createdAt: sale.createdAt || new Date().toISOString(),
        pointsAwarded: sale.pointsAwarded || 0
    };
}

function withDerived(sale) {
    const paid = (sale.payments || []).reduce((acc, p) => acc + (Number(p.amount)||0), 0);
    return { ...sale, paidAmount: paid, balance: Math.max(sale.total - paid, 0), status: (sale.total - paid) <= 0 ? "PAID" : "PENDING" };
}

export function getAllSales() { return read().map(s => withDerived(normalizeSale(s))); }
export function getSalesByPatientId(pid) { return getAllSales().filter(s => s.patientId === pid); }

// ... (ensureWorkOrdersForSale - Igual que antes) ...
function ensureWorkOrdersForSale(sale) {
    const existing = getAllWorkOrders();
    const existingKeys = new Set(existing.map((w) => `${w.saleId}::${w.saleItemId}`));
    sale.items.forEach((item) => {
        if (!item.requiresLab) return;
        const key = `${sale.id}::${item.id}`;
        if (existingKeys.has(key)) return;
        createWorkOrder({
            patientId: sale.patientId, saleId: sale.id, saleItemId: item.id,
            type: item.kind === "CONTACT_LENS" ? "LC" : "LENTES",
            status: "TO_PREPARE", labName: item.labName || "",
            rxNotes: item.rxSnapshot ? JSON.stringify(item.rxSnapshot) : "",
            dueDate: item.dueDate || null, createdAt: sale.createdAt,
        });
    });
}

export function createSale(payload) {
  if (!payload?.patientId) throw new Error("patientId requerido");
  const list = read();
  const now = new Date().toISOString();
  const loyalty = getLoyaltySettings();

  // PUNTOS
  let pointsToAward = 0;
  if (loyalty.enabled) {
      const method = payload.payments?.[0]?.method || "EFECTIVO";
      const rate = loyalty.earningRates[method] !== undefined ? loyalty.earningRates[method] : loyalty.earningRates["GLOBAL"];
      pointsToAward = Math.floor((payload.total * rate) / 100);
  }

  // Procesamos pagos para incluir comisiones
  const processedPayments = (payload.payments || []).map(p => normalizePayment(p, now));

  const normalizedSale = normalizeSale({
    id: crypto.randomUUID(),
    ...payload,
    payments: processedPayments,
    createdAt: now,
    pointsAwarded: pointsToAward
  });

  normalizedSale.items.forEach(item => {
    if (item.inventoryProductId) adjustStock(item.inventoryProductId, -item.qty);
  });

  if (pointsToAward > 0) adjustPatientPoints(payload.patientId, pointsToAward);
  const patient = getPatientById(payload.patientId);
  if (loyalty.enabled && patient && patient.referredBy) {
      const referralPoints = Math.floor((payload.total * loyalty.referralBonusPercent) / 100);
      if (referralPoints > 0) adjustPatientPoints(patient.referredBy, referralPoints);
  }

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
    
    // Aseguramos que pase por el normalizador para capturar fees
    const newPay = normalizePayment({ ...payment, id: crypto.randomUUID(), amount, paidAt: new Date().toISOString() }, new Date().toISOString());
    
    const nextSale = { ...norm, payments: [...norm.payments, newPay] };
    updated = withDerived(nextSale);
    return nextSale;
  });
  if(updated) write(next);
  return updated;
}

export function deleteSale(id) {
  write(read().filter(s => s.id !== id));
}

// --- REPORTE FINANCIERO (CON TOTAL FEES) ---
export function getFinancialReport() {
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