import { createWorkOrder, getAllWorkOrders, deleteWorkOrdersBySaleId } from "./workOrdersStorage";
import { adjustStock } from "./inventoryStorage";
import { getPatientById, adjustPatientPoints } from "./patientsStorage"; 
import { getLoyaltySettings } from "./settingsStorage"; 
import { createExpense } from "./expensesStorage";
import { getCurrentShift } from "./shiftsStorage"; // 👈 IMPORTAR GESTOR DE TURNOS

const KEY = "lusso_sales_v1";
const LAB_KINDS = new Set(["LENSES", "CONTACT_LENS"]);

// Helper simple para obtener YYYY-MM-DD
const getDay = (iso) => iso ? iso.slice(0, 10) : "";

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
    cost: Number(base.cost) || 0,
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
        notes: base.specs?.notes || "",
        requiresBisel: base.specs?.requiresBisel !== undefined ? base.specs.requiresBisel : true,
        requiresTallado: base.specs?.requiresTallado || false
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
     feeAmount: Number(p.feeAmount) || 0,
     shiftId: p.shiftId || null 
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
    soldBy: sale.soldBy || sale.logistics?.soldBy || "",
    kind: sale.kind || items[0]?.kind || "OTHER",
    description: sale.description || items[0]?.description || "",
    subtotalGross, discount, total,
    items, payments,
    createdAt: sale.createdAt || new Date().toISOString(),
    updatedAt: sale.updatedAt || sale.createdAt || new Date().toISOString(),
    pointsAwarded: sale.pointsAwarded || 0,
    shiftId: sale.shiftId || null,
    logistics: {
        jobMadeBy: sale.logistics?.jobMadeBy || sale.labDetails?.jobMadeBy || "",
        labSentBy: sale.logistics?.labSentBy || sale.labDetails?.sentBy || "",
        labReceivedBy: sale.logistics?.labReceivedBy || sale.labDetails?.receivedBy || "",
        courier: sale.logistics?.courier || sale.labDetails?.courier || "",
        deliveryDate: sale.logistics?.deliveryDate || sale.labDetails?.deliveryDate || null
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
  
  const total = Number(sale.total) || 0;
  const paid = Number(sale.paidAmount) || 0;
  const ratio = total > 0 ? paid / total : 1;
  const initialStatus = ratio >= 0.5 ? "TO_PREPARE" : "ON_HOLD";

  sale.items.forEach(item => {
    if (!item.requiresLab) return;
    const key = `${sale.id}::${item.id}`;
    if (existingKeys.has(key)) return;
    
    createWorkOrder({
      patientId: sale.patientId,
      saleId: sale.id,
      saleItemId: item.id,
      type: item.kind === "CONTACT_LENS" ? "LC" : "LENTES",
      status: initialStatus,
      labName: item.labName || "",
      labCost: item.cost || 0, 
      rxNotes: item.rxSnapshot ? JSON.stringify(item.rxSnapshot) : "",
      dueDate: item.dueDate || null,
      createdAt: sale.createdAt,
    });
  });
}

export function createSale(payload) {
  if (!payload?.patientId) throw new Error("patientId requerido");
  
  // 👈 VALIDACIÓN DE TURNO ABIERTO (BLOQUEO DE CAJA)
  const currentShift = getCurrentShift();
  if (!currentShift) {
      throw new Error("⛔ CAJA CERRADA: No hay un turno abierto para cobrar.");
  }

  const list = read();
  const now = new Date().toISOString();
  const loyalty = getLoyaltySettings();

  const paymentsWithShift = (payload.payments || []).map(p => ({
      ...p,
      shiftId: currentShift.id // Vinculamos al turno
  }));

  let pointsToAward = 0;
  if (loyalty.enabled) {
      const method = payload.payments?.[0]?.method || "EFECTIVO";
      const rate = loyalty.earningRates[method] !== undefined ? loyalty.earningRates[method] : loyalty.earningRates["GLOBAL"];
      pointsToAward = Math.floor((payload.total * rate) / 100);
  }

  const normalizedSale = normalizeSale({
    id: crypto.randomUUID(),
    ...payload,
    payments: paymentsWithShift,
    shiftId: currentShift.id,
    createdAt: now,
    updatedAt: now,
    pointsAwarded: pointsToAward
  });

  normalizedSale.items.forEach(item => {
    if (item.inventoryProductId) {
        adjustStock(item.inventoryProductId, -item.qty, `Venta #${normalizedSale.id.slice(0,6)}`);
    }
  });

  if (pointsToAward > 0) adjustPatientPoints(payload.patientId, pointsToAward);
  const patient = getPatientById(payload.patientId);
  if (loyalty.enabled && patient && patient.referredBy) {
      const referralPoints = Math.floor((payload.total * loyalty.referralBonusPercent) / 100);
      if (referralPoints > 0) adjustPatientPoints(patient.referredBy, referralPoints);
  }

  write([normalizedSale, ...list]);
  
  const finalSale = withDerived(normalizedSale);
  ensureWorkOrdersForSale(finalSale);
  return finalSale;
}

export function updateSaleLogistics(id, data) {
    const list = read();
    const now = new Date().toISOString();
    const next = list.map(s => {
        if (s.id !== id) return s;
        return { ...s, soldBy: data.soldBy!==undefined?data.soldBy:s.soldBy, logistics: { ...(s.logistics||{}), ...(data.labDetails||{}) }, updatedAt: now };
    });
    write(next);
}

export function addPaymentToSale(saleId, payment) {
  const currentShift = getCurrentShift();
  if (!currentShift) throw new Error("⛔ CAJA CERRADA: Abre un turno para recibir abonos.");

  const list = read();
  
  let updated = null;
  const next = list.map(s => {
    if (s.id !== saleId) return s;
    const norm = normalizeSale(s);
    const derived = withDerived(norm);
    const amount = Math.min(Number(payment?.amount) || 0, derived.balance);
    if (amount <= 0) return s;
    
    const newPay = normalizePayment({ 
        ...payment, 
        id: crypto.randomUUID(), 
        amount, 
        paidAt: new Date().toISOString(),
        shiftId: currentShift.id 
    }, new Date().toISOString());
    
    const updatedSale = { ...norm, payments: [...norm.payments, newPay], updatedAt: new Date().toISOString() };
    updated = withDerived(updatedSale);
    return updatedSale;
  });
  if(updated) write(next);
  return updated;
}

export function processReturn(saleId, itemId, qtyToReturn, refundMethod = "EFECTIVO", notes = "") {
    const currentShift = getCurrentShift();
    // Permitir devolución sin turno abierto es debatible, pero mejor bloquearlo por consistencia financiera
    if (!currentShift) throw new Error("⛔ CAJA CERRADA: No se pueden procesar devoluciones (salida de dinero) sin turno.");

    const list = read();
    let sale = list.find(s => s.id === saleId);
    if (!sale) throw new Error("Venta no encontrada");

    const item = sale.items.find(i => i.id === itemId);
    if (!item) throw new Error("Producto no encontrado en la venta");
    
    const refundAmount = item.unitPrice * qtyToReturn;

    if (item.inventoryProductId) {
        adjustStock(
            item.inventoryProductId, 
            qtyToReturn,
            `Devolución Venta #${saleId.slice(0,6)}`
        );
    }

    if (refundAmount > 0) {
        createExpense({
            description: `Reembolso / Devolución: ${item.description} (Venta #${saleId.slice(0,6)})`,
            amount: refundAmount,
            category: "COSTO_VENTA",
            method: refundMethod,
            date: new Date().toISOString(),
            shiftId: currentShift.id
        });
    }

    const updatedItems = sale.items.map(i => {
        if (i.id === itemId) {
            return { 
                ...i, 
                returnedQty: (i.returnedQty || 0) + qtyToReturn,
                qty: i.qty - qtyToReturn
            };
        }
        return i;
    });

    const newSubtotal = updatedItems.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
    const newTotal = Math.max(0, newSubtotal - (sale.discount || 0));
    
    const next = list.map(s => s.id === saleId ? { ...s, items: updatedItems, total: newTotal, updatedAt: new Date().toISOString() } : s);
    write(next);

    return true;
}

export function deleteSale(id) { 
    const list = read();
    const sale = list.find(s => s.id === id);

    if (sale) {
        if (sale.pointsAwarded > 0) adjustPatientPoints(sale.patientId, -sale.pointsAwarded);
        const loyalty = getLoyaltySettings();
        const patient = getPatientById(sale.patientId);
        
        if (loyalty.enabled && patient && patient.referredBy) {
            const referralPoints = Math.floor((sale.total * loyalty.referralBonusPercent) / 100);
            if (referralPoints > 0) adjustPatientPoints(patient.referredBy, -referralPoints);
        }
        
        sale.items.forEach(item => {
            if (item.inventoryProductId) adjustStock(item.inventoryProductId, item.qty, `Cancelación Venta #${sale.id.slice(0,6)}`);
        });
    }

    deleteWorkOrdersBySaleId(id);
    write(list.filter(s => s.id !== id)); 
}

export function getFinancialReport(startDate, endDate) {
    const sales = getAllSales();
    
    let totalSales = 0;      
    let totalIncome = 0;     
    let totalReceivable = 0; 
    
    const incomeByMethod = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, OTRO: 0 };
    
    sales.forEach(sale => {
        const saleDate = getDay(sale.createdAt);
        const isSaleInRange = (!startDate || saleDate >= startDate) && (!endDate || saleDate <= endDate);
        
        if (isSaleInRange) {
            totalSales += sale.total;
            if (sale.balance > 0) totalReceivable += sale.balance;
        }

        sale.payments.forEach(pay => {
            const payDate = getDay(pay.paidAt);
            const isPayInRange = (!startDate || payDate >= startDate) && (!endDate || payDate <= endDate);
            
            if (isPayInRange) {
                totalIncome += pay.amount;
                const m = (pay.method || "OTRO").toUpperCase();
                incomeByMethod[m] = (incomeByMethod[m] || 0) + pay.amount;
            }
        });
    });

    return { totalSales, totalIncome, totalReceivable, incomeByMethod };
}

export function getProfitabilityReport(startDate, endDate) {
    const sales = getAllSales();
    const workOrders = getAllWorkOrders();
    
    const labCostMap = {};
    workOrders.forEach(w => {
        if (w.saleId && w.saleItemId) {
            const key = `${w.saleId}::${w.saleItemId}`;
            labCostMap[key] = (labCostMap[key] || 0) + (w.labCost || 0);
        }
    });

    const report = {
        global: { sales: 0, cost: 0, profit: 0 },
        byCategory: {} 
    };

    sales.forEach(sale => {
        const saleDate = getDay(sale.createdAt);
        if (startDate && saleDate < startDate) return;
        if (endDate && saleDate > endDate) return;

        sale.items.forEach(item => {
            const kind = item.kind || "OTHER";
            const itemSaleTotal = item.unitPrice * item.qty;
            const itemProductCost = (item.cost || 0) * item.qty;
            
            const woKey = `${sale.id}::${item.id}`;
            const itemServiceCost = labCostMap[woKey] || 0;

            const totalItemCost = itemProductCost + itemServiceCost;
            const itemProfit = itemSaleTotal - totalItemCost;

            report.global.sales += itemSaleTotal;
            report.global.cost += totalItemCost;
            report.global.profit += itemProfit;

            if (!report.byCategory[kind]) {
                report.byCategory[kind] = { sales: 0, cost: 0, profit: 0, count: 0 };
            }
            report.byCategory[kind].sales += itemSaleTotal;
            report.byCategory[kind].cost += totalItemCost;
            report.byCategory[kind].profit += itemProfit;
            report.byCategory[kind].count += item.qty;
        });
        
        if (sale.discount > 0) {
            report.global.sales -= sale.discount;
            report.global.profit -= sale.discount;
        }
    });

    return report;
}

export function getSalesMetricsByShift(shiftId) {
    if (!shiftId) return { totalIncome: 0, incomeByMethod: {} };
    
    const sales = getAllSales();
    let totalIncome = 0;
    const incomeByMethod = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, CHEQUE: 0, OTRO: 0 };

    sales.forEach(sale => {
        sale.payments.forEach(pay => {
            if (pay.shiftId === shiftId) {
                totalIncome += pay.amount;
                const m = (pay.method || "OTRO").toUpperCase();
                incomeByMethod[m] = (incomeByMethod[m] || 0) + pay.amount;
            }
        });
    });

    return { totalIncome, incomeByMethod };
}