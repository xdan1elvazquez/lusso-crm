import { createWorkOrder, getAllWorkOrders } from "./workOrdersStorage";
import { adjustStock } from "./inventoryStorage";
import { getPatientById, adjustPatientPoints } from "./patientsStorage"; 
import { getLoyaltySettings } from "./settingsStorage"; 

const KEY = "lusso_sales_v1";
const LAB_KINDS = new Set(["LENSES", "CONTACT_LENS"]);

function read() {
  try {
    const str = localStorage.getItem(KEY);
    if (!str) return [];
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object') : [];
  } catch { return []; }
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
  const fallback = saleFallback || {};
  const kind = base.kind || mapLegacyCategoryToKind(base.category || fallback.category || fallback.kind);

  return {
    id: base.id ?? crypto.randomUUID(),
    kind,
    description: base.description || fallback.description || "",
    qty: Number(base.qty) || 1,
    unitPrice: Number(base.unitPrice) || 0,
    requiresLab: LAB_KINDS.has(kind) || Boolean(base.requiresLab),
    consultationId: base.consultationId ?? fallback.consultationId ?? null,
    eyeExamId: base.eyeExamId ?? null,
    inventoryProductId: base.inventoryProductId ?? null,
    taxable: base.taxable !== undefined ? Boolean(base.taxable) : true,
    rxSnapshot: base.rxSnapshot ?? null,
    labName: base.labName || "",
    dueDate: base.dueDate || null,
    
    specs: {
        material: base.specs?.material || "",
        design: base.specs?.design || "",
        treatment: base.specs?.treatment || "",
        frameModel: base.specs?.frameModel || "",
        frameStatus: base.specs?.frameStatus || "NUEVO",
        notes: base.specs?.notes || ""
    }
  };
}

function normalizePayment(p, defaultDate) {
  return {
     id: p.id || crypto.randomUUID(),
     amount: Number(p.amount) || 0,
     method: p.method || "EFECTIVO",
     paidAt: p.paidAt || defaultDate,
     cardType: p.cardType || null,
     terminal: p.terminal || null,
     installments: p.installments || null,
     feeAmount: Number(p.feeAmount) || 0
  };
}

function normalizeSale(raw) {
  const sale = raw || {};
  let itemsArray = Array.isArray(sale.items) ? sale.items : [sale];
  const items = itemsArray.map(i => normalizeItem(i, sale));
  
  const subtotalGross = items.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0);
  const discount = Number(sale.discount) || 0;
  let total = subtotalGross - discount; if (total < 0) total = 0;

  const payments = (Array.isArray(sale.payments) ? sale.payments : []).map(p => normalizePayment(p, sale.createdAt || new Date().toISOString()));
  
  return {
    id: sale.id || crypto.randomUUID(),
    patientId: sale.patientId ?? null,
    boxNumber: sale.boxNumber || "",
    
    // DATOS GENERALES
    soldBy: sale.soldBy || sale.logistics?.soldBy || "", // 👈 AHORA EN RAÍZ (GENERAL)
    
    kind: sale.kind || items[0]?.kind || "OTHER",
    description: sale.description || items[0]?.description || "",
    subtotalGross, discount, total,
    items, payments,
    createdAt: sale.createdAt || new Date().toISOString(),
    updatedAt: sale.updatedAt || sale.createdAt || new Date().toISOString(),
    pointsAwarded: sale.pointsAwarded || 0,

    // 👈 DATOS EXCLUSIVOS DE LABORATORIO / TALLER
    labDetails: {
        jobMadeBy: sale.labDetails?.jobMadeBy || sale.logistics?.jobMadeBy || "",
        sentBy: sale.labDetails?.sentBy || sale.logistics?.labSentBy || "",
        receivedBy: sale.labDetails?.receivedBy || sale.logistics?.labReceivedBy || "",
        courier: sale.labDetails?.courier || sale.logistics?.courier || "",
        deliveryDate: sale.labDetails?.deliveryDate || sale.logistics?.deliveryDate || null
    }
  };
}

function withDerived(sale) {
  const paidAmount = sale.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const balance = Math.max(sale.total - paidAmount, 0);
  const status = balance <= 0.01 ? "PAID" : "PENDING";
  return { ...sale, paidAmount, balance, status };
}

export function getAllSales() { return read().map(s => withDerived(normalizeSale(s))); }
export function getSalesByPatientId(id) { return getAllSales().filter(s => s.patientId === id); }

function ensureWorkOrdersForSale(sale) {
  const existing = getAllWorkOrders();
  const existingKeys = new Set(existing.map(w => `${w.saleId}::${w.saleItemId}`));
  sale.items.forEach(item => {
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
  
  const normalizedSale = normalizeSale({
    id: crypto.randomUUID(),
    ...payload,
    createdAt: now, updatedAt: now
  });

  normalizedSale.items.forEach(item => {
    if (item.inventoryProductId) adjustStock(item.inventoryProductId, -item.qty);
  });

  // Puntos
  const loyalty = getLoyaltySettings();
  if (loyalty.enabled && normalizedSale.pointsAwarded > 0) {
      adjustPatientPoints(payload.patientId, normalizedSale.pointsAwarded);
      const p = getPatientById(payload.patientId);
      if (p && p.referredBy) {
         const refPts = Math.floor((normalizedSale.total * loyalty.referralBonusPercent) / 100);
         if (refPts > 0) adjustPatientPoints(p.referredBy, refPts);
      }
  }

  write([normalizedSale, ...list]);
  ensureWorkOrdersForSale(normalizedSale);
  return withDerived(normalizedSale);
}

// Función actualizada para guardar datos de logística y vendedor
export function updateSaleLogistics(id, data) {
    const list = read();
    const now = new Date().toISOString();
    const next = list.map(s => {
        if (s.id !== id) return s;
        return { 
            ...s, 
            soldBy: data.soldBy !== undefined ? data.soldBy : s.soldBy, // Actualizar vendedor
            labDetails: { ...(s.labDetails || {}), ...(data.labDetails || {}) }, // Actualizar lab
            updatedAt: now
        };
    });
    write(next);
}

export function addPaymentToSale(saleId, payment) {
  const list = read();
  let updated = null;
  const next = list.map(s => {
    if (s.id !== saleId) return s;
    const norm = normalizeSale(s);
    const derived = withDerived(norm);
    const amount = Math.min(Number(payment?.amount) || 0, derived.balance);
    if (amount <= 0) return s;
    const newPay = normalizePayment({ ...payment, id: crypto.randomUUID(), amount, paidAt: new Date().toISOString() }, new Date().toISOString());
    const updatedSale = { ...norm, payments: [...norm.payments, newPay], updatedAt: new Date().toISOString() };
    updated = withDerived(updatedSale);
    return updatedSale;
  });
  if(updated) write(next);
  return updated;
}

export function deleteSale(id) { write(read().filter(s => s.id !== id)); }

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