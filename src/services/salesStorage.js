import { db } from "@/firebase/config";
import { 
  collection, doc, runTransaction, getDocs, getDoc, updateDoc, deleteDoc, query, where, orderBy, addDoc 
} from "firebase/firestore";
import { getLoyaltySettings, getTerminals } from "./settingsStorage"; 
import { getCurrentShift } from "./shiftsStorage"; 
import { cancelWorkOrderBySaleItem } from "./workOrdersStorage"; 
import { adjustStock } from "./inventoryStorage";
import { adjustPatientPoints } from "./patientsStorage"; 
import { createExpense } from "./expensesStorage"; 

const COLLECTION_NAME = "sales";
const COLLECTION_PRODUCTS = "products";
const COLLECTION_PATIENTS = "patients";
const COLLECTION_LOGS = "inventory_logs";

// --- HELPER INTERNO: CALCULAR Y REGISTRAR COMISIÓN ---
async function registerCardCommission(payment, saleId, branchId) {
    try {
        if (payment.method !== "TARJETA" || !payment.terminal) return;

        const terminals = await getTerminals();
        const termConfig = terminals.find(t => t.name === payment.terminal);
        
        if (!termConfig) return;

        let ratePct = Number(termConfig.fee) || 0;
        
        const monthsMatch = (payment.cardType || "").match(/(\d+)/);
        if (monthsMatch) {
            const months = monthsMatch[1];
            if (termConfig.rates && termConfig.rates[months]) {
                ratePct += Number(termConfig.rates[months]);
            }
        }

        const commissionAmount = (Number(payment.amount) * ratePct) / 100;

        if (commissionAmount > 0) {
            await createExpense({
                description: `Comisión Tarjeta (${payment.terminal} - ${payment.cardType || 'C'}): Venta #${saleId.slice(0,6)}`,
                amount: commissionAmount,
                category: "COMISION_BANCARIA",
                method: "OTRO", 
                date: new Date().toISOString()
            }, branchId);
            console.log(`✅ Comisión registrada: $${commissionAmount}`);
        }
    } catch (error) {
        console.error("Error registrando comisión automática:", error);
    }
}

// --- LECTURA ---
export async function getAllSales(branchId = "lusso_main") {
  const q = query(
      collection(db, COLLECTION_NAME), 
      where("branchId", "==", branchId),
      orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getSaleById(id) {
    if (!id) return null;
    const ref = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
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
    const incomeByMethod = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, CHEQUE: 0, PUNTOS: 0, OTRO: 0 };
    
    snapshot.forEach(doc => {
        const sale = doc.data();
        if (Array.isArray(sale.payments)) {
            sale.payments.forEach(pay => {
                if (pay.shiftId === shiftId) {
                    totalIncome += Number(pay.amount);
                    const m = (pay.method || "OTRO").toUpperCase();
                    if (incomeByMethod[m] !== undefined) incomeByMethod[m] += Number(pay.amount);
                    else incomeByMethod["OTRO"] = (incomeByMethod["OTRO"] || 0) + Number(pay.amount);
                }
            });
        }
    });
    return { totalIncome, incomeByMethod };
}

export async function getFinancialReport(startDate, endDate, branchId = "lusso_main") { 
    const q = query(
        collection(db, COLLECTION_NAME),
        where("branchId", "==", branchId)
    );
    const snapshot = await getDocs(q);
    let totalSalesGenerated = 0, totalIncome = 0, totalReceivable = 0;
    const incomeByMethod = {};

    snapshot.forEach(doc => {
        const s = doc.data();
        const sDate = s.createdAt.slice(0, 10);
        if (sDate >= startDate && sDate <= endDate) totalSalesGenerated += Number(s.total) || 0;
        if (s.balance > 0.01) totalReceivable += Number(s.balance);
        if (Array.isArray(s.payments)) {
            s.payments.forEach(p => {
                const pDate = p.paidAt.slice(0, 10);
                if (pDate >= startDate && pDate <= endDate) {
                    const amount = Number(p.amount) || 0;
                    totalIncome += amount;
                    const method = (p.method || "OTRO").toUpperCase();
                    incomeByMethod[method] = (incomeByMethod[method] || 0) + amount;
                }
            });
        }
    });
    return { totalSales: totalSalesGenerated, totalIncome, totalReceivable, incomeByMethod }; 
}

export async function getProfitabilityReport(startDate, endDate, branchId = "lusso_main") { 
    const q = query(
        collection(db, COLLECTION_NAME), 
        where("branchId", "==", branchId),
        where("createdAt", ">=", startDate + "T00:00:00"), 
        where("createdAt", "<=", endDate + "T23:59:59")
    );
    const snapshot = await getDocs(q);
    const global = { sales: 0, cost: 0, profit: 0 };
    const byCategory = {};

    snapshot.forEach(doc => {
        const s = doc.data();
        const saleTotal = Number(s.total) || 0;
        let saleCost = 0;
        if (Array.isArray(s.items)) {
            s.items.forEach(item => {
                if (item.qty > 0) {
                    saleCost += (Number(item.cost) || 0) * item.qty;
                    const cat = item.kind || "OTHER";
                    if (!byCategory[cat]) byCategory[cat] = { sales: 0, cost: 0, profit: 0 };
                    const itemSale = (item.unitPrice * item.qty); 
                    byCategory[cat].sales += itemSale;
                    byCategory[cat].cost += ((Number(item.cost)||0) * item.qty);
                    byCategory[cat].profit += itemSale - ((Number(item.cost)||0) * item.qty);
                }
            });
        }
        global.sales += saleTotal;
        global.cost += saleCost;
        global.profit += (saleTotal - saleCost);
    });
    return { global, byCategory }; 
}

// --- CREACIÓN (ATÓMICA) ---
export async function createSale(payload, branchId = "lusso_main") {
  if (!payload?.patientId) throw new Error("patientId requerido");
  
  const currentShift = await getCurrentShift(branchId);
  if (!currentShift) throw new Error("⛔ CAJA CERRADA: No hay un turno abierto en esta sucursal.");
  
  const loyalty = await getLoyaltySettings(); 
  
  const saleResult = await runTransaction(db, async (transaction) => {
    // Validaciones básicas
    const patientRef = doc(db, COLLECTION_PATIENTS, payload.patientId);
    const patientSnap = await transaction.get(patientRef);
    if (!patientSnap.exists()) throw new Error("Paciente no encontrado");
    const patientData = patientSnap.data();
    if (patientData.deletedAt) throw new Error(`⛔ PACIENTE ELIMINADO`);

    let referrerRef = null;
    let referrerSnap = null;
    if (loyalty.enabled && patientData.referredBy) {
        referrerRef = doc(db, COLLECTION_PATIENTS, patientData.referredBy);
        referrerSnap = await transaction.get(referrerRef);
    }

    const sanitizedItems = payload.items.map(i => ({ ...i, id: i.id || crypto.randomUUID() }));
    const inventoryUpdates = [];
    for (const item of sanitizedItems) {
        if (item.inventoryProductId) {
            const prodRef = doc(db, COLLECTION_PRODUCTS, item.inventoryProductId);
            const prodSnap = await transaction.get(prodRef);
            if (!prodSnap.exists()) throw new Error(`Producto no encontrado: ${item.description}`);
            const prodData = prodSnap.data();
            if (!prodData.isOnDemand && (prodData.stock || 0) < item.qty) {
                throw new Error(`Stock insuficiente para: ${prodData.brand} ${prodData.model}`);
            }
            inventoryUpdates.push({ ref: prodRef, newStock: (Number(prodData.stock) || 0) - item.qty, qty: item.qty });
        }
    }

    const now = new Date().toISOString();
    const hasLabItems = sanitizedItems.some(i => i.requiresLab === true);
    
    let pointsToAward = 0; 
    let referrerPoints = 0;
    
    const paymentsWithShift = (payload.payments || []).map(p => ({ ...p, shiftId: currentShift.id }));
    const paidAmount = paymentsWithShift.reduce((sum, p) => sum + Number(p.amount), 0);
    
    const pointsUsed = paymentsWithShift.filter(p => p.method === "PUNTOS").reduce((sum, p) => sum + Number(p.amount), 0);
    if (pointsUsed > 0 && (patientData.points || 0) < pointsUsed) {
        throw new Error(`Saldo insuficiente de puntos.`);
    }

    if (loyalty.enabled) {
        paymentsWithShift.forEach(pay => {
            const amount = Number(pay.amount) || 0;
            if (amount <= 0) return;
            const method = pay.method || "EFECTIVO";
            if (method !== "PUNTOS") {
                const ownRate = loyalty.earningRates[method] !== undefined ? loyalty.earningRates[method] : loyalty.earningRates["GLOBAL"];
                pointsToAward += Math.floor((amount * ownRate) / 100);
                if (referrerSnap && referrerSnap.exists()) {
                    const refRate = Number(loyalty.referralBonusPercent) || 0;
                    referrerPoints += Math.floor((amount * refRate) / 100);
                }
            }
        });
    }

    const newSaleRef = doc(collection(db, COLLECTION_NAME));
    const newSale = {
        branchId: branchId,
        patientId: payload.patientId,
        patientName: `${patientData.firstName} ${patientData.lastName}`.trim(),
        boxNumber: payload.boxNumber || "",
        soldBy: payload.soldBy || "",
        kind: sanitizedItems[0]?.kind || "OTHER",
        saleType: hasLabItems ? "LAB" : "SIMPLE",
        description: payload.description || (hasLabItems ? "Venta Óptica" : "Venta Mostrador"),
        subtotalGross: Number(payload.subtotalGross) || 0,
        discount: Number(payload.discount) || 0,
        total: Number(payload.total) || 0,
        paidAmount: paidAmount,
        balance: Math.max(0, payload.total - paidAmount),
        items: sanitizedItems,
        payments: paymentsWithShift,
        shiftId: currentShift.id,
        createdAt: now,
        updatedAt: now,
        pointsAwarded: pointsToAward,
        status: "PENDING"
    };
    if (newSale.balance <= 0.01) newSale.status = "PAID";

    // Work Orders
    if (hasLabItems) {
        const total = Number(newSale.total) || 0;
        const paid = Number(newSale.paidAmount) || 0;
        const ratio = total > 0 ? paid / total : 1;
        const initialStatus = ratio >= 0.5 ? "TO_PREPARE" : "ON_HOLD";

        const lenses = sanitizedItems.filter(i => i.kind === "LENSES");
        const frames = sanitizedItems.filter(i => i.kind === "FRAMES");
        const contacts = sanitizedItems.filter(i => i.kind === "CONTACT_LENS");
        let availableFrames = [...frames];

        for (const lens of lenses) {
            const linkedFrame = availableFrames.shift(); 
            const workOrderId = `wo_${newSaleRef.id}_${lens.id}`; 
            const workOrderRef = doc(db, "work_orders", workOrderId);
            transaction.set(workOrderRef, {
                id: workOrderId, 
                branchId: branchId,
                patientId: payload.patientId,
                saleId: newSaleRef.id,
                saleItemId: lens.id,
                type: "LENTES",
                status: initialStatus,
                labName: lens.labName || "",
                labCost: Number(lens.cost) || 0,
                rxNotes: lens.rxSnapshot ? JSON.stringify(lens.rxSnapshot) : "",
                frameCondition: linkedFrame ? `Nuevo: ${linkedFrame.description}` : "Propio/No especificado",
                dueDate: lens.dueDate || null,
                createdAt: now,
                updatedAt: now,
                isWarranty: false,
                warrantyHistory: [],
                history: []
            });
        }
        for (const cl of contacts) {
            const workOrderId = `wo_${newSaleRef.id}_${cl.id}`; 
            const workOrderRef = doc(db, "work_orders", workOrderId);
            transaction.set(workOrderRef, {
                id: workOrderId, 
                branchId: branchId,
                patientId: payload.patientId,
                saleId: newSaleRef.id,
                saleItemId: cl.id,
                type: "LC",
                status: initialStatus,
                labName: "Lentes de Contacto",
                labCost: Number(cl.cost) || 0,
                rxNotes: cl.rxSnapshot ? JSON.stringify(cl.rxSnapshot) : "",
                dueDate: cl.dueDate || null,
                createdAt: now,
                updatedAt: now,
                isWarranty: false,
                warrantyHistory: [],
                history: []
            });
        }
    }

    transaction.set(newSaleRef, newSale);

    inventoryUpdates.forEach(update => {
        transaction.update(update.ref, { stock: update.newStock });
        const logRef = doc(collection(db, COLLECTION_LOGS));
        transaction.set(logRef, { productId: update.ref.id, type: "SALE", quantity: -update.qty, finalStock: update.newStock, reference: `Venta #${newSaleRef.id.slice(0,6)}`, date: now });
    });

    const netPointsChange = pointsToAward - pointsUsed;
    if (netPointsChange !== 0) {
        transaction.update(patientRef, { points: (Number(patientData.points) || 0) + netPointsChange });
    }
    if (referrerPoints > 0 && referrerSnap.exists()) {
        transaction.update(referrerRef, { points: (Number(referrerSnap.data().points) || 0) + referrerPoints });
    }

    return { id: newSaleRef.id, ...newSale };
  });

  // Comisión Automática
  if (saleResult && saleResult.payments) {
      for (const p of saleResult.payments) {
          await registerCardCommission(p, saleResult.id, branchId);
      }
  }

  return saleResult;
}

// --- ABONOS (MODIFICACIÓN) ---
export async function addPaymentToSale(saleId, payment) {
  const shift = await getCurrentShift(); 
  if (!shift) throw new Error("⛔ CAJA CERRADA: Abre un turno para abonos.");

  let saleBranchId = null;

  await runTransaction(db, async (transaction) => {
      const saleRef = doc(db, COLLECTION_NAME, saleId);
      const saleSnap = await transaction.get(saleRef);
      if (!saleSnap.exists()) throw new Error("Venta no encontrada");
      
      const saleData = saleSnap.data();
      saleBranchId = saleData.branchId; 

      if (saleData.branchId && shift.branchId && saleData.branchId !== shift.branchId) {
          throw new Error(`⛔ SUCURSAL INCORRECTA: Venta de "${saleData.branchId}".`);
      }

      const currentPaid = (saleData.payments || []).reduce((sum, p) => sum + (Number(p.amount)||0), 0);
      const balance = saleData.total - currentPaid;
      const amountToPay = Math.min(Number(payment.amount), balance);
      if (amountToPay <= 0) return; 

      let pointsUsed = 0;
      if (payment.method === "PUNTOS") {
          const patientRef = doc(db, COLLECTION_PATIENTS, saleData.patientId);
          const patientSnap = await transaction.get(patientRef);
          if (patientSnap.exists()) {
              const pPoints = patientSnap.data().points || 0;
              if (pPoints < amountToPay) throw new Error("Saldo insuficiente de puntos");
              pointsUsed = amountToPay;
              transaction.update(patientRef, { points: pPoints - pointsUsed });
          }
      }

      const newPayment = {
          id: crypto.randomUUID(),
          amount: amountToPay,
          method: payment.method || "EFECTIVO",
          paidAt: new Date().toISOString(),
          shiftId: shift.id,
          terminal: payment.terminal || null,
          cardType: payment.cardType || null,
          note: payment.note || "" 
      };

      const newPayments = [...(saleData.payments||[]), newPayment];
      const newBalance = saleData.total - (currentPaid + amountToPay);

      transaction.update(saleRef, {
          payments: newPayments,
          balance: newBalance,
          paidAmount: currentPaid + amountToPay,
          status: newBalance <= 0.01 ? "PAID" : "PENDING",
          updatedAt: new Date().toISOString()
      });
  });

  if (payment.method === "TARJETA" && saleBranchId) {
      await registerCardCommission(payment, saleId, saleBranchId);
  }
}

// 🟢 NUEVA FUNCIÓN: ELIMINAR UN PAGO INDIVIDUAL
export async function deletePaymentFromSale(saleId, paymentId) {
    const currentShift = await getCurrentShift();
    if (!currentShift) throw new Error("⛔ CAJA CERRADA: Necesitas turno abierto para corregir pagos.");

    await runTransaction(db, async (transaction) => {
        const saleRef = doc(db, COLLECTION_NAME, saleId);
        const saleSnap = await transaction.get(saleRef);
        if (!saleSnap.exists()) throw new Error("Venta no encontrada");

        const saleData = saleSnap.data();
        const paymentIndex = saleData.payments.findIndex(p => p.id === paymentId);
        
        if (paymentIndex === -1) throw new Error("Pago no encontrado");
        
        const paymentToDelete = saleData.payments[paymentIndex];
        
        // 1. Revertir Puntos USADOS
        if (paymentToDelete.method === "PUNTOS") {
            const patientRef = doc(db, COLLECTION_PATIENTS, saleData.patientId);
            const patientSnap = await transaction.get(patientRef);
            if (patientSnap.exists()) {
                const currentPoints = patientSnap.data().points || 0;
                transaction.update(patientRef, { points: currentPoints + Number(paymentToDelete.amount) });
            }
        }

        // 2. Revertir Puntos GANADOS
        const loyalty = await getLoyaltySettings();
        if (loyalty.enabled && paymentToDelete.method !== "PUNTOS") {
            const rate = loyalty.earningRates[paymentToDelete.method] || loyalty.earningRates["GLOBAL"] || 0;
            const pointsToRevoke = Math.floor((Number(paymentToDelete.amount) * rate) / 100);
            
            if (pointsToRevoke > 0) {
                const patientRef = doc(db, COLLECTION_PATIENTS, saleData.patientId);
                // NOTA: Idealmente leer de nuevo, pero Firestore mergea si no hay conflicto
                const pSnap = await transaction.get(patientRef);
                if (pSnap.exists()) {
                    transaction.update(patientRef, { points: (pSnap.data().points || 0) - pointsToRevoke });
                }
            }
        }

        // 3. Recalcular
        const newPayments = saleData.payments.filter(p => p.id !== paymentId);
        const newPaidAmount = newPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const newBalance = saleData.total - newPaidAmount;

        // 4. Actualizar
        transaction.update(saleRef, {
            payments: newPayments,
            paidAmount: newPaidAmount,
            balance: newBalance,
            status: newBalance <= 0.01 ? "PAID" : "PENDING",
            updatedAt: new Date().toISOString()
        });
    });
}

// ... (Resto de funciones: updateSalePaymentMethod, updateSaleLogistics, processReturn, deleteSale IGUALES)
export async function updateSalePaymentMethod(saleId, paymentId, newMethod) {
  const saleRef = doc(db, COLLECTION_NAME, saleId);
  const saleSnap = await getDoc(saleRef);
  if (!saleSnap.exists()) return false;
  const saleData = saleSnap.data();
  const newPayments = saleData.payments.map(p => p.id === paymentId ? { ...p, method: newMethod } : p);
  await updateDoc(saleRef, { payments: newPayments, updatedAt: new Date().toISOString() });
  return true;
}

export async function updateSaleLogistics(id, data) {
    const saleRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(saleRef, { soldBy: data.soldBy, updatedAt: new Date().toISOString() });
}

export async function processReturn(saleId, itemId, qtyToReturn, refundMethod = "EFECTIVO", shouldRestock = true) {
    const currentShift = await getCurrentShift();
    if (!currentShift) throw new Error("⛔ CAJA CERRADA: Requieres turno para devoluciones.");

    const saleRef = doc(db, COLLECTION_NAME, saleId);
    const saleSnap = await getDoc(saleRef);
    if (!saleSnap.exists()) throw new Error("Venta no encontrada");
    
    const sale = saleSnap.data();
    let itemIndex = -1;
    if (itemId) itemIndex = sale.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) itemIndex = sale.items.findIndex(i => !i.id); 

    if (itemIndex === -1) throw new Error("No se pudo identificar el producto a devolver.");

    const item = sale.items[itemIndex];
    let stockError = null;
    
    if (shouldRestock && item.inventoryProductId) {
        try {
            await adjustStock(item.inventoryProductId, qtyToReturn, `Devolución Venta #${saleId.slice(0,6)}`);
        } catch (e) {
            console.error("Error devolviendo stock:", e);
            stockError = e.message;
        }
    }

    const originalSubtotal = sale.subtotalGross || sale.items.reduce((sum, i) => sum + ((i.qty + (i.returnedQty || 0)) * i.unitPrice), 0);
    const discountRatio = originalSubtotal > 0 ? (sale.discount / originalSubtotal) : 0;

    const grossRefund = item.unitPrice * qtyToReturn;
    const discountRecapture = grossRefund * discountRatio; 
    const netRefund = Math.round((grossRefund - discountRecapture) * 100) / 100;

    let newPayments = [...(sale.payments||[])];
    
    if (netRefund > 0) {
        newPayments.push({
            id: crypto.randomUUID(),
            amount: -netRefund, 
            method: refundMethod,
            paidAt: new Date().toISOString(),
            shiftId: currentShift.id,
            note: `Reembolso: ${item.description} (Aj. Desc)`
        });

        if (refundMethod === "PUNTOS") {
            try { await adjustPatientPoints(sale.patientId, netRefund); } 
            catch(e) { console.error("Error devolviendo puntos", e); }
        }
    }

    if (item.requiresLab) {
        try { await cancelWorkOrderBySaleItem(saleId, item.id || itemId); } catch(e){ console.error(e); }
    }

    const refundRatio = sale.total > 0 ? netRefund / sale.total : 0;
    const pointsToRevoke = Math.floor((sale.pointsAwarded || 0) * refundRatio);
    if (pointsToRevoke > 0) {
        try { await adjustPatientPoints(sale.patientId, -pointsToRevoke); } catch (e) { console.error(e); }
    }

    const updatedItems = [...sale.items];
    updatedItems[itemIndex] = {
        ...item,
        returnedQty: (item.returnedQty || 0) + qtyToReturn,
        qty: item.qty - qtyToReturn
    };

    const newSubtotal = updatedItems.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
    const newDiscount = Math.max(0, (sale.discount || 0) - discountRecapture);
    const newTotal = Math.max(0, newSubtotal - newDiscount);
    const newPaidAmount = newPayments.reduce((sum, p) => sum + (Number(p.amount)||0), 0);
    const newBalance = Math.max(0, newTotal - newPaidAmount);

    let newStatus = sale.status;
    if (newBalance <= 0.01) newStatus = newTotal === 0 ? "REFUNDED" : "PAID";

    await updateDoc(saleRef, { 
        items: updatedItems, 
        subtotalGross: newSubtotal,
        discount: Math.round(newDiscount * 100) / 100,
        total: Math.round(newTotal * 100) / 100, 
        payments: newPayments,
        paidAmount: Math.round(newPaidAmount * 100) / 100,
        balance: Math.round(newBalance * 100) / 100,
        status: newStatus,
        pointsAwarded: Math.max(0, (sale.pointsAwarded || 0) - pointsToRevoke), 
        updatedAt: new Date().toISOString() 
    });

    return { stockError };
}

export async function deleteSale(id) {
    if (!id) return;
    const saleRef = doc(db, COLLECTION_NAME, id);
    const saleSnap = await getDoc(saleRef);
    if (!saleSnap.exists()) return; 
    const sale = saleSnap.data();
    const woQuery = query(collection(db, "work_orders"), where("saleId", "==", id));
    const woSnap = await getDocs(woQuery);

    await runTransaction(db, async (transaction) => {
        const patientRef = doc(db, COLLECTION_PATIENTS, sale.patientId);
        const patientSnap = await transaction.get(patientRef);
        const productReads = [];
        for (const item of sale.items) {
            if (item.inventoryProductId && item.qty > 0) {
                const prodRef = doc(db, COLLECTION_PRODUCTS, item.inventoryProductId);
                productReads.push({ ref: prodRef, item });
            }
        }
        const productSnaps = await Promise.all(productReads.map(p => transaction.get(p.ref)));

        productSnaps.forEach((pSnap, index) => {
            if (pSnap.exists()) {
                const prodData = pSnap.data();
                const { item } = productReads[index];
                if (!prodData.isOnDemand) {
                    const currentStock = Number(prodData.stock) || 0;
                    const newStock = currentStock + item.qty;
                    transaction.update(productReads[index].ref, { stock: newStock });
                    const logRef = doc(collection(db, COLLECTION_LOGS));
                    transaction.set(logRef, {
                        productId: pSnap.id,
                        type: "CANCEL",
                        quantity: item.qty,
                        finalStock: newStock,
                        reference: `Cancelación Venta #${id.slice(0,6)}`,
                        date: new Date().toISOString()
                    });
                }
            }
        });

        if (sale.pointsAwarded > 0 && patientSnap.exists()) {
            const currentPoints = Number(patientSnap.data().points) || 0;
            transaction.update(patientRef, { points: currentPoints - sale.pointsAwarded });
        }

        woSnap.docs.forEach(woDoc => { transaction.delete(woDoc.ref); });
        transaction.delete(saleRef);
    });
}