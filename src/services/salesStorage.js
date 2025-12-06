import { db } from "@/firebase/config";
import { 
  collection, doc, runTransaction, getDocs, getDoc, updateDoc, deleteDoc, query, where, orderBy, addDoc 
} from "firebase/firestore";
import { getLoyaltySettings } from "./settingsStorage"; 
import { getCurrentShift } from "./shiftsStorage"; 
import { createWorkOrder, deleteWorkOrdersBySaleId } from "./workOrdersStorage";
import { adjustStock } from "./inventoryStorage"; // Usada solo para devoluciones/cancelaciones
import { adjustPatientPoints } from "./patientsStorage"; 
import { createExpense } from "./expensesStorage";

const COLLECTION_NAME = "sales";
const COLLECTION_PRODUCTS = "products";
const COLLECTION_PATIENTS = "patients";
const COLLECTION_LOGS = "inventory_logs";

// ==========================================
// 1. FUNCIONES DE LECTURA
// ==========================================

export async function getAllSales() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getSalesByPatientId(id) {
  const q = query(collection(db, COLLECTION_NAME), where("patientId", "==", id));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getSalesMetricsByShift(shiftId) {
    if (!shiftId) return { totalIncome: 0, incomeByMethod: {} };
    const q = query(collection(db, COLLECTION_NAME), where("shiftId", "==", shiftId));
    const snapshot = await getDocs(q);
    let totalIncome = 0;
    const incomeByMethod = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, CHEQUE: 0, OTRO: 0 };
    snapshot.forEach(doc => {
        const sale = doc.data();
        sale.payments.forEach(pay => {
            if (pay.shiftId === shiftId) {
                totalIncome += pay.amount;
                const m = (pay.method || "OTRO").toUpperCase();
                if (incomeByMethod[m] !== undefined) incomeByMethod[m] += pay.amount;
            }
        });
    });
    return { totalIncome, incomeByMethod };
}

// Reportes financieros simples (placeholders para compatibilidad)
export async function getFinancialReport(startDate, endDate) { return { totalSales: 0, totalIncome: 0, totalReceivable: 0, incomeByMethod: {} }; }
export async function getProfitabilityReport(startDate, endDate) { return { global: {}, byCategory: {} }; }


// ==========================================
// 2. FUNCIÓN DE CREACIÓN (Transacción Segura)
// ==========================================

// Helper interno para Work Orders (se ejecuta POST-transacción)
async function ensureWorkOrdersForSale(sale, saleId) {
    const total = Number(sale.total) || 0;
    const paid = Number(sale.paidAmount) || 0;
    const ratio = total > 0 ? paid / total : 1;
    const initialStatus = ratio >= 0.5 ? "TO_PREPARE" : "ON_HOLD";

    for (const item of sale.items) {
        if (item.requiresLab) {
            await createWorkOrder({
                patientId: sale.patientId,
                saleId: saleId,
                saleItemId: item.id,
                type: item.kind === "CONTACT_LENS" ? "LC" : "LENTES",
                status: initialStatus,
                labName: item.labName || "",
                labCost: item.cost || 0,
                rxNotes: item.rxSnapshot ? JSON.stringify(item.rxSnapshot) : "",
                dueDate: item.dueDate || null,
                createdAt: sale.createdAt,
            });
        }
    }
}

export async function createSale(payload) {
  if (!payload?.patientId) throw new Error("patientId requerido");

  const currentShift = await getCurrentShift();
  if (!currentShift) throw new Error("⛔ CAJA CERRADA: No hay un turno abierto.");

  const loyalty = await getLoyaltySettings(); 
  
  // TRANSACCIÓN ATÓMICA
  const saleResult = await runTransaction(db, async (transaction) => {
    
    // --- A. LECTURAS ---
    const patientRef = doc(db, COLLECTION_PATIENTS, payload.patientId);
    const patientSnap = await transaction.get(patientRef);
    if (!patientSnap.exists()) throw new Error("Paciente no encontrado");
    const patientData = patientSnap.data();

    let referrerRef = null;
    let referrerSnap = null;
    if (loyalty.enabled && patientData.referredBy) {
        referrerRef = doc(db, COLLECTION_PATIENTS, patientData.referredBy);
        referrerSnap = await transaction.get(referrerRef);
    }

    const inventoryUpdates = [];
    for (const item of payload.items) {
        if (item.inventoryProductId) {
            const prodRef = doc(db, COLLECTION_PRODUCTS, item.inventoryProductId);
            const prodSnap = await transaction.get(prodRef);
            
            if (!prodSnap.exists()) throw new Error(`Producto no encontrado: ${item.description}`);
            
            const prodData = prodSnap.data();
            
            // Validación Stock
            if (!prodData.isOnDemand && (prodData.stock || 0) < item.qty) {
                throw new Error(`Stock insuficiente para: ${prodData.brand} ${prodData.model}`);
            }

            inventoryUpdates.push({ 
                ref: prodRef, 
                newStock: (Number(prodData.stock) || 0) - item.qty,
                qty: item.qty
            });
        }
    }

    // --- B. LÓGICA ---
    const now = new Date().toISOString();
    const hasLabItems = payload.items.some(i => i.requiresLab === true);
    
    let pointsToAward = 0;
    if (loyalty.enabled) {
        const method = payload.payments?.[0]?.method || "EFECTIVO";
        const rate = loyalty.earningRates[method] !== undefined ? loyalty.earningRates[method] : loyalty.earningRates["GLOBAL"];
        pointsToAward = Math.floor((payload.total * rate) / 100);
    }

    const paymentsWithShift = (payload.payments || []).map(p => ({ ...p, shiftId: currentShift.id }));
    const paidAmount = paymentsWithShift.reduce((sum, p) => sum + Number(p.amount), 0);

    const newSaleRef = doc(collection(db, COLLECTION_NAME));
    const newSale = {
        patientId: payload.patientId,
        // ⚡ OPTIMIZACIÓN: Guardamos nombre para no buscarlo después
        patientName: `${patientData.firstName} ${patientData.lastName}`.trim(),
        
        boxNumber: payload.boxNumber || "",
        soldBy: payload.soldBy || "",
        kind: payload.items[0]?.kind || "OTHER",
        saleType: hasLabItems ? "LAB" : "SIMPLE",
        description: payload.description || (hasLabItems ? "Venta Óptica" : "Venta Mostrador"),
        subtotalGross: Number(payload.subtotalGross) || 0,
        discount: Number(payload.discount) || 0,
        total: Number(payload.total) || 0,
        paidAmount: paidAmount,
        balance: Math.max(0, payload.total - paidAmount),
        items: payload.items,
        payments: paymentsWithShift,
        shiftId: currentShift.id,
        createdAt: now,
        updatedAt: now,
        pointsAwarded: pointsToAward,
        status: "PENDING"
    };
    if (newSale.balance <= 0.01) newSale.status = "PAID";

    // --- C. ESCRITURAS ---
    transaction.set(newSaleRef, newSale);

    inventoryUpdates.forEach(update => {
        transaction.update(update.ref, { stock: update.newStock });
        
        const logRef = doc(collection(db, COLLECTION_LOGS));
        transaction.set(logRef, {
            productId: update.ref.id,
            type: "SALE",
            quantity: -update.qty,
            finalStock: update.newStock,
            reference: `Venta #${newSaleRef.id.slice(0,6)}`,
            date: now
        });
    });

    if (pointsToAward > 0) {
        transaction.update(patientRef, { points: (patientData.points || 0) + pointsToAward });
    }

    if (referrerSnap && referrerSnap.exists()) {
        const refPoints = Math.floor((payload.total * loyalty.referralBonusPercent) / 100);
        if (refPoints > 0) {
            transaction.update(referrerRef, { points: (referrerSnap.data().points || 0) + refPoints });
        }
    }

    return { id: newSaleRef.id, ...newSale };
  });

  // D. POST-PROCESAMIENTO (Work Orders)
  if (saleResult.saleType === "LAB") {
      await ensureWorkOrdersForSale(saleResult, saleResult.id).catch(console.error);
  }

  return saleResult;
}

// ==========================================
// 3. FUNCIONES DE MODIFICACIÓN
// ==========================================

export async function addPaymentToSale(saleId, payment) {
  const currentShift = await getCurrentShift();
  if (!currentShift) throw new Error("⛔ CAJA CERRADA: Abre un turno para abonos.");

  const saleRef = doc(db, COLLECTION_NAME, saleId);
  const saleSnap = await getDoc(saleRef);
  if (!saleSnap.exists()) throw new Error("Venta no encontrada");
  
  const saleData = saleSnap.data();
  const currentPaid = saleData.payments.reduce((sum, p) => sum + (Number(p.amount)||0), 0);
  const balance = saleData.total - currentPaid;
  const amountToPay = Math.min(Number(payment.amount), balance);

  if (amountToPay <= 0) return;

  const newPayment = {
      id: crypto.randomUUID(),
      amount: amountToPay,
      method: payment.method || "EFECTIVO",
      paidAt: new Date().toISOString(),
      shiftId: currentShift.id,
      terminal: payment.terminal || null,
      cardType: payment.cardType || null
  };

  const newPayments = [...saleData.payments, newPayment];
  const newBalance = saleData.total - (currentPaid + amountToPay);
  
  await updateDoc(saleRef, {
      payments: newPayments,
      balance: newBalance,
      status: newBalance <= 0.01 ? "PAID" : "PENDING",
      updatedAt: new Date().toISOString()
  });
}

export async function updateSalePaymentMethod(saleId, paymentId, newMethod) {
  const saleRef = doc(db, COLLECTION_NAME, saleId);
  const saleSnap = await getDoc(saleRef);
  if (!saleSnap.exists()) return false;
  
  const saleData = saleSnap.data();
  const newPayments = saleData.payments.map(p => 
      p.id === paymentId ? { ...p, method: newMethod } : p
  );

  await updateDoc(saleRef, { payments: newPayments, updatedAt: new Date().toISOString() });
  return true;
}

export async function updateSaleLogistics(id, data) {
    const saleRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(saleRef, { soldBy: data.soldBy, updatedAt: new Date().toISOString() });
}

export async function processReturn(saleId, itemId, qtyToReturn, refundMethod = "EFECTIVO") {
    const currentShift = await getCurrentShift();
    if (!currentShift) throw new Error("⛔ CAJA CERRADA: Requieres turno para devoluciones.");

    const saleRef = doc(db, COLLECTION_NAME, saleId);
    const saleSnap = await getDoc(saleRef);
    if (!saleSnap.exists()) throw new Error("Venta no encontrada");
    
    const sale = saleSnap.data();
    const itemIndex = sale.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) throw new Error("Producto no encontrado");

    const item = sale.items[itemIndex];
    
    if (item.inventoryProductId) {
        // Usamos función externa para devoluciones (fuera de la transacción de venta)
        await adjustStock(item.inventoryProductId, qtyToReturn, `Devolución Venta #${saleId.slice(0,6)}`);
    }

    const refundAmount = item.unitPrice * qtyToReturn;
    if (refundAmount > 0) {
        await createExpense({
            description: `Devolución: ${item.description} (Venta #${saleId.slice(0,6)})`,
            amount: refundAmount,
            category: "COSTO_VENTA",
            method: refundMethod,
            date: new Date().toISOString(),
            shiftId: currentShift.id
        });
    }

    const updatedItems = [...sale.items];
    updatedItems[itemIndex] = {
        ...item,
        returnedQty: (item.returnedQty || 0) + qtyToReturn,
        qty: item.qty - qtyToReturn
    };

    const newSubtotal = updatedItems.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
    const newTotal = Math.max(0, newSubtotal - (sale.discount || 0));

    await updateDoc(saleRef, { items: updatedItems, total: newTotal, updatedAt: new Date().toISOString() });
}

export async function deleteSale(id) {
    const saleRef = doc(db, COLLECTION_NAME, id);
    const saleSnap = await getDoc(saleRef);
    if (saleSnap.exists()) {
        const sale = saleSnap.data();
        if (sale.pointsAwarded > 0) await adjustPatientPoints(sale.patientId, -sale.pointsAwarded);
        const tasks = sale.items.map(item => item.inventoryProductId ? adjustStock(item.inventoryProductId, item.qty, `Cancelación Venta #${id.slice(0,6)}`) : null).filter(Boolean);
        await Promise.all(tasks);
    }
    await deleteDoc(saleRef);
    await deleteWorkOrdersBySaleId(id);
}