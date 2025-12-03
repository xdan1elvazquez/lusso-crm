import { db } from "@/firebase/config";
import { 
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy 
} from "firebase/firestore";

// Servicios vinculados (Async)
import { createWorkOrder, getAllWorkOrders, deleteWorkOrdersBySaleId } from "./workOrdersStorage";
import { adjustStock } from "./inventoryStorage";
import { adjustPatientPoints, getPatientById } from "./patientsStorage"; 
import { createExpense } from "./expensesStorage";
import { getCurrentShift } from "./shiftsStorage";
import { getLoyaltySettings } from "./settingsStorage"; 

const COLLECTION_NAME = "sales";

// Helper simple para fechas
const getDay = (iso) => iso ? iso.slice(0, 10) : "";

// --- LECTURA ---
export async function getAllSales() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getSalesByPatientId(id) {
  const q = query(collection(db, COLLECTION_NAME), where("patientId", "==", id));
  const snapshot = await getDocs(q);
  // Ordenamos en cliente
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// --- CREACIÓN DE VENTA ---
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

  const now = new Date().toISOString();
  const loyalty = getLoyaltySettings();

  const paymentsWithShift = (payload.payments || []).map(p => ({
      ...p,
      shiftId: currentShift.id
  }));

  let pointsToAward = 0;
  if (loyalty.enabled) {
      const method = payload.payments?.[0]?.method || "EFECTIVO";
      const rate = loyalty.earningRates[method] !== undefined ? loyalty.earningRates[method] : loyalty.earningRates["GLOBAL"];
      pointsToAward = Math.floor((payload.total * rate) / 100);
  }

  const newSale = {
    patientId: payload.patientId,
    boxNumber: payload.boxNumber || "",
    soldBy: payload.soldBy || "",
    kind: payload.items[0]?.kind || "OTHER",
    description: payload.items[0]?.description || "Venta General",
    
    subtotalGross: Number(payload.subtotalGross) || 0,
    discount: Number(payload.discount) || 0,
    total: Number(payload.total) || 0,
    paidAmount: paymentsWithShift.reduce((sum, p) => sum + Number(p.amount), 0),
    balance: Math.max(0, payload.total - paymentsWithShift.reduce((sum, p) => sum + Number(p.amount), 0)),
    
    items: payload.items,
    payments: paymentsWithShift,
    
    shiftId: currentShift.id,
    createdAt: now,
    updatedAt: now,
    pointsAwarded: pointsToAward,
    status: "PENDING" // Se recalcula al leer o actualizar
  };
  
  // Corregir status inicial
  if (newSale.balance <= 0.01) newSale.status = "PAID";

  const docRef = await addDoc(collection(db, COLLECTION_NAME), newSale);
  const saleId = docRef.id;

  // Efectos secundarios en paralelo
  const tasks = [];
  payload.items.forEach(item => {
    if (item.inventoryProductId) {
        tasks.push(adjustStock(item.inventoryProductId, -item.qty, `Venta #${saleId.slice(0,6)}`));
    }
  });

  if (pointsToAward > 0) tasks.push(adjustPatientPoints(payload.patientId, pointsToAward));
  
  if (loyalty.enabled) {
      const patient = await getPatientById(payload.patientId);
      if (patient && patient.referredBy) {
          const referralPoints = Math.floor((payload.total * loyalty.referralBonusPercent) / 100);
          if (referralPoints > 0) tasks.push(adjustPatientPoints(patient.referredBy, referralPoints));
      }
  }

  await Promise.all(tasks);
  await ensureWorkOrdersForSale(newSale, saleId);

  return { id: saleId, ...newSale };
}

// --- ACTUALIZACIONES Y ABONOS ---

export async function addPaymentToSale(saleId, payment) {
  const currentShift = await getCurrentShift();
  if (!currentShift) throw new Error("⛔ CAJA CERRADA: Abre un turno para abonos.");

  const saleRef = doc(db, COLLECTION_NAME, saleId);
  const saleSnap = await getDoc(saleRef);
  
  if (!saleSnap.exists()) throw new Error("Venta no encontrada");
  const saleData = saleSnap.data();

  // Calcular nuevo saldo
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
      // Extras si es tarjeta
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
    await updateDoc(saleRef, {
        soldBy: data.soldBy,
        updatedAt: new Date().toISOString()
    });
}

// --- DEVOLUCIONES (Restaurada) ---
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
    
    // 1. Ajustar Inventario (Devolver stock)
    if (item.inventoryProductId) {
        await adjustStock(item.inventoryProductId, qtyToReturn, `Devolución Venta #${saleId.slice(0,6)}`);
    }

    // 2. Registrar Egreso de Caja (Si aplica reembolso)
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

    // 3. Actualizar Venta
    const updatedItems = [...sale.items];
    updatedItems[itemIndex] = {
        ...item,
        returnedQty: (item.returnedQty || 0) + qtyToReturn,
        qty: item.qty - qtyToReturn
    };

    // Recalcular total venta
    const newSubtotal = updatedItems.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
    const newTotal = Math.max(0, newSubtotal - (sale.discount || 0));

    await updateDoc(saleRef, {
        items: updatedItems,
        total: newTotal,
        updatedAt: new Date().toISOString()
    });
}

// --- ELIMINAR ---
export async function deleteSale(id) {
    const saleRef = doc(db, COLLECTION_NAME, id);
    const saleSnap = await getDoc(saleRef);
    
    if (saleSnap.exists()) {
        const sale = saleSnap.data();
        
        // Revertir puntos
        if (sale.pointsAwarded > 0) {
            await adjustPatientPoints(sale.patientId, -sale.pointsAwarded);
        }
        
        // Revertir inventario
        const tasks = sale.items.map(item => {
            if (item.inventoryProductId) {
                return adjustStock(item.inventoryProductId, item.qty, `Cancelación Venta #${id.slice(0,6)}`);
            }
            return null;
        }).filter(Boolean);
        
        await Promise.all(tasks);
    }

    await deleteDoc(saleRef);
    await deleteWorkOrdersBySaleId(id);
}

// --- REPORTES ---

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

export async function getFinancialReport(startDate, endDate) {
    const sales = await getAllSales(); 
    let totalSales = 0, totalIncome = 0, totalReceivable = 0;
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

// 👈 Reporte de Rentabilidad (Restaurado para FinancePage)
export async function getProfitabilityReport(startDate, endDate) {
    const [sales, workOrders] = await Promise.all([
        getAllSales(),
        getAllWorkOrders()
    ]);
    
    const labCostMap = {};
    workOrders.forEach(w => {
        if (w.saleId && w.saleItemId) {
            const key = `${w.saleId}::${w.saleItemId}`;
            labCostMap[key] = (labCostMap[key] || 0) + (w.labCost || 0);
        }
    });

    const report = { global: { sales: 0, cost: 0, profit: 0 }, byCategory: {} };

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

            if (!report.byCategory[kind]) report.byCategory[kind] = { sales: 0, cost: 0, profit: 0, count: 0 };
            
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