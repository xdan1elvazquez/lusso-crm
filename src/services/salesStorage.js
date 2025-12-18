import { db } from "@/firebase/config";
import { 
  collection, doc, runTransaction, getDocs, getDoc, updateDoc, query, where, orderBy 
} from "firebase/firestore";
import { getLoyaltySettings, getTerminals } from "./settingsStorage"; 
import { getCurrentShift } from "./shiftsStorage"; 
import { cancelWorkOrderBySaleItem } from "./workOrdersStorage"; 
import { adjustStock } from "./inventoryStorage";
import { adjustPatientPoints } from "./patientsStorage"; 
import { roundMoney } from "@/utils/currency";
import { 
    prepareInventoryUpdates, 
    calculateLoyaltyPoints, 
    prepareBankCommissions, 
    prepareWorkOrders 
} from "@/domain/sales/SalePreparers";

// --- NUEVOS IMPORTS ---
import { logAuditAction } from "./auditStorage";
import { recordLedgerEntry } from "./ledgerStorage";
import { 
  PAYMENT_METHODS, 
  EXPENSE_CATEGORIES, 
  WO_STATUS, 
  AUDIT_ACTIONS, 
  LEDGER_TYPES 
} from "@/utils/constants";

const COLLECTION_NAME = "sales";
const COLLECTION_PRODUCTS = "products";
const COLLECTION_PATIENTS = "patients";
const COLLECTION_LOGS = "inventory_logs";
const COLLECTION_EXPENSES = "expenses"; 
const COLLECTION_WORK_ORDERS = "work_orders";

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
        if (sale.status === "CANCELLED") return;

        if (Array.isArray(sale.payments)) {
            sale.payments.forEach(pay => {
                if (pay.shiftId === shiftId) {
                    const amount = roundMoney(pay.amount);
                    totalIncome += amount;
                    const m = (pay.method || "OTRO").toUpperCase();
                    if (incomeByMethod[m] !== undefined) incomeByMethod[m] += amount;
                    else incomeByMethod["OTRO"] = (incomeByMethod["OTRO"] || 0) + amount;
                }
            });
        }
    });
    return { totalIncome: roundMoney(totalIncome), incomeByMethod };
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
        if (s.status === "CANCELLED") return;

        const sDate = s.createdAt.slice(0, 10);
        
        if (sDate >= startDate && sDate <= endDate) {
            totalSalesGenerated += roundMoney(s.total || 0);
        }
        
        if (s.balance > 0.01) {
            totalReceivable += roundMoney(s.balance);
        }

        if (Array.isArray(s.payments)) {
            s.payments.forEach(p => {
                const pDate = p.paidAt.slice(0, 10);
                if (pDate >= startDate && pDate <= endDate) {
                    const amount = roundMoney(p.amount || 0);
                    totalIncome += amount;
                    const method = (p.method || "OTRO").toUpperCase();
                    incomeByMethod[method] = (incomeByMethod[method] || 0) + amount;
                }
            });
        }
    });
    
    return { 
        totalSales: roundMoney(totalSalesGenerated), 
        totalIncome: roundMoney(totalIncome), 
        totalReceivable: roundMoney(totalReceivable), 
        incomeByMethod 
    }; 
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
        if (s.status === "CANCELLED") return;

        const saleTotal = roundMoney(s.total || 0);
        let saleCost = 0;
        
        if (Array.isArray(s.items)) {
            s.items.forEach(item => {
                if (item.qty > 0) {
                    const itemCost = roundMoney((Number(item.cost) || 0) * item.qty);
                    saleCost += itemCost;
                    
                    const cat = item.kind || "OTHER";
                    if (!byCategory[cat]) byCategory[cat] = { sales: 0, cost: 0, profit: 0 };
                    
                    const itemSale = roundMoney(item.unitPrice * item.qty); 
                    byCategory[cat].sales += itemSale;
                    byCategory[cat].cost += itemCost;
                    byCategory[cat].profit += roundMoney(itemSale - itemCost);
                }
            });
        }
        global.sales += saleTotal;
        global.cost += roundMoney(saleCost);
        global.profit += roundMoney(saleTotal - saleCost);
    });
    
    return { global, byCategory }; 
}

// --- CREACIÓN (ATÓMICA CON AUDITORÍA) ---
export async function createSale(payload, branchId = "lusso_main") {
  if (!payload?.patientId) throw new Error("patientId requerido");
  
  const currentShift = await getCurrentShift(branchId);
  if (!currentShift) throw new Error("⛔ CAJA CERRADA: No hay un turno abierto en esta sucursal.");
  
  const loyalty = await getLoyaltySettings(); 
  const terminals = await getTerminals(); 
  const user = payload.soldBy || "Unknown";
  
  const saleResult = await runTransaction(db, async (transaction) => {
    // 1. LECTURAS
    const patientRef = doc(db, COLLECTION_PATIENTS, payload.patientId);
    const patientSnap = await transaction.get(patientRef);
    if (!patientSnap.exists()) throw new Error("Paciente no encontrado");
    const patientData = patientSnap.data();
    if (patientData.deletedAt) throw new Error(`⛔ PACIENTE ELIMINADO.`);

    let referrerRef = null;
    let referrerData = null;
    if (loyalty.enabled && patientData.referredBy) {
        referrerRef = doc(db, COLLECTION_PATIENTS, patientData.referredBy);
        const referrerSnap = await transaction.get(referrerRef);
        if (referrerSnap.exists()) referrerData = referrerSnap.data();
    }

    const sanitizedItems = payload.items.map(i => ({ ...i, id: i.id || crypto.randomUUID() }));
    const productDataMap = new Map();
    
    for (const item of sanitizedItems) {
        if (item.inventoryProductId) {
            const prodRef = doc(db, COLLECTION_PRODUCTS, item.inventoryProductId);
            const prodSnap = await transaction.get(prodRef);
            if (prodSnap.exists()) {
                productDataMap.set(item.inventoryProductId, prodSnap.data());
            }
        }
    }

    // 2. LÓGICA DE NEGOCIO
    const now = new Date().toISOString();
    const paymentsWithShift = (payload.payments || []).map(p => ({ ...p, shiftId: currentShift.id }));
    const totalSale = roundMoney(payload.total || 0);
    const paidAmount = roundMoney(paymentsWithShift.reduce((sum, p) => sum + Number(p.amount), 0));
    
    const pointsUsed = paymentsWithShift.filter(p => p.method === PAYMENT_METHODS.POINTS).reduce((sum, p) => sum + Number(p.amount), 0);
    if (pointsUsed > 0 && (patientData.points || 0) < pointsUsed) {
        throw new Error(`Saldo insuficiente de puntos.`);
    }

    const inventoryOps = prepareInventoryUpdates(sanitizedItems, productDataMap);
    const loyaltyResult = calculateLoyaltyPoints(paymentsWithShift, patientData, referrerData, loyalty);
    const bankExpenses = prepareBankCommissions(paymentsWithShift, terminals, branchId, now);

    const newSaleRef = doc(collection(db, COLLECTION_NAME));
    const workOrders = prepareWorkOrders(sanitizedItems, newSaleRef.id, branchId, payload.patientId, now, totalSale, paidAmount);

    const hasLabItems = sanitizedItems.some(i => i.requiresLab === true);
    const balance = Math.max(0, roundMoney(totalSale - paidAmount));
    
    const newSale = {
        branchId: branchId,
        patientId: payload.patientId,
        patientName: `${patientData.firstName} ${patientData.lastName}`.trim(),
        boxNumber: payload.boxNumber || "",
        soldBy: user,
        kind: sanitizedItems[0]?.kind || "OTHER",
        saleType: hasLabItems ? "LAB" : "SIMPLE",
        description: payload.description || (hasLabItems ? "Venta Óptica" : "Venta Mostrador"),
        subtotalGross: roundMoney(payload.subtotalGross || 0),
        discount: roundMoney(payload.discount || 0),
        total: totalSale,
        paidAmount: paidAmount,
        balance: balance,
        items: sanitizedItems,
        payments: paymentsWithShift,
        shiftId: currentShift.id,
        createdAt: now,
        updatedAt: now,
        pointsAwarded: loyaltyResult.pointsToAward,
        status: (balance <= 0.01) ? "PAID" : "PENDING"
    };

    transaction.set(newSaleRef, newSale);

    workOrders.forEach(wo => {
        const { _id, ...woData } = wo;
        const woRef = doc(db, COLLECTION_WORK_ORDERS, _id);
        transaction.set(woRef, woData);
    });

    bankExpenses.forEach(expense => {
        const expenseRef = doc(collection(db, COLLECTION_EXPENSES));
        transaction.set(expenseRef, expense);
    });

    inventoryOps.updates.forEach(upd => {
        const ref = doc(db, COLLECTION_PRODUCTS, upd.productId);
        transaction.update(ref, { stock: upd.newStock });
    });

    inventoryOps.logs.forEach(log => {
        const logRef = doc(collection(db, COLLECTION_LOGS));
        transaction.set(logRef, { ...log, reference: `Venta #${newSaleRef.id.slice(0,6)}`, date: now });
    });

    // 🟢 LUSSO INTELLIGENCE: Actualización de Puntos y Fechas de Retorno
    const netPointsChange = loyaltyResult.pointsToAward - pointsUsed;
    
    // Calculamos fecha de recall (+1 año)
    const recallDate = new Date();
    recallDate.setFullYear(recallDate.getFullYear() + 1);

    // Preparamos payload del paciente
    const patientUpdatePayload = {
        lastSaleDate: now,
        nextRecallDate: recallDate.toISOString()
    };

    // Si hubo cambio de puntos, lo agregamos al mismo update
    if (netPointsChange !== 0) {
        patientUpdatePayload.points = (Number(patientData.points) || 0) + netPointsChange;
    }

    // Ejecutamos update único
    transaction.update(patientRef, patientUpdatePayload);

    if (loyaltyResult.referrerPoints > 0 && referrerRef) {
        transaction.update(referrerRef, { points: (Number(referrerData.points) || 0) + loyaltyResult.referrerPoints });
    }

    // AUDITORÍA Y LEDGER
    logAuditAction({
        entityType: "SALE",
        entityId: newSaleRef.id,
        action: AUDIT_ACTIONS.CREATE_SALE,
        user: user,
        reason: "Nueva venta registrada",
        previousState: null
    }, transaction);

    paymentsWithShift.forEach(payment => {
        if (Number(payment.amount) > 0) {
            recordLedgerEntry({
                saleId: newSaleRef.id,
                amount: Number(payment.amount),
                type: LEDGER_TYPES.SALE, 
                method: payment.method,
                shiftId: currentShift.id,
                user: user,
                reference: `Pago Inicial Venta #${newSaleRef.id.slice(0,6)}`,
                terminal: payment.terminal || null
            }, transaction);
        }
    });

    return { id: newSaleRef.id, ...newSale };
  });

  return saleResult;
}

// --- MODIFICACIONES DE VENTA (ABONOS) ---
export async function addPaymentToSale(saleId, payment) {
  const shift = await getCurrentShift(); 
  if (!shift) throw new Error("⛔ CAJA CERRADA: Abre un turno para abonos.");

  const loyalty = await getLoyaltySettings();
  const terminals = await getTerminals(); 
  const branchId = shift.branchId;
  const user = shift.user || "Cajero";

  await runTransaction(db, async (transaction) => {
      const saleRef = doc(db, COLLECTION_NAME, saleId);
      const saleSnap = await transaction.get(saleRef);
      if (!saleSnap.exists()) throw new Error("Venta no encontrada");
      
      const saleData = saleSnap.data();
      if (saleData.status === "CANCELLED") throw new Error("⛔ VENTA CANCELADA: No recibe abonos.");

      if (saleData.branchId && branchId && saleData.branchId !== branchId) {
          throw new Error(`⛔ SUCURSAL INCORRECTA: Venta de "${saleData.branchId}".`);
      }

      const patientRef = doc(db, COLLECTION_PATIENTS, saleData.patientId);
      const patientSnap = await transaction.get(patientRef);
      if (!patientSnap.exists()) throw new Error("Paciente no encontrado");
      const patientData = patientSnap.data();

      let referrerRef = null;
      let referrerSnap = null;
      if (loyalty.enabled && patientData.referredBy) {
          referrerRef = doc(db, COLLECTION_PATIENTS, patientData.referredBy);
          referrerSnap = await transaction.get(referrerRef);
      }

      const currentPaid = roundMoney((saleData.payments || []).reduce((sum, p) => sum + (Number(p.amount)||0), 0));
      const balance = roundMoney(saleData.total - currentPaid);
      
      const amountToPay = roundMoney(Math.min(Number(payment.amount), balance));
      if (amountToPay <= 0) return; 

      const method = payment.method || PAYMENT_METHODS.CASH;
      let pointsUsed = 0;
      
      if (method === PAYMENT_METHODS.POINTS) {
          const pPoints = patientData.points || 0;
          if (pPoints < amountToPay) throw new Error("Saldo insuficiente de puntos");
          pointsUsed = amountToPay;
      }

      let pointsToAward = 0;
      let referrerPoints = 0;
      if (loyalty.enabled && method !== PAYMENT_METHODS.POINTS) {
          const ownRate = loyalty.earningRates[method] !== undefined ? loyalty.earningRates[method] : loyalty.earningRates["GLOBAL"];
          pointsToAward = Math.floor((amountToPay * ownRate) / 100);
          if (referrerSnap && referrerSnap.exists()) {
              const refRate = Number(loyalty.referralBonusPercent) || 0;
              referrerPoints = Math.floor((amountToPay * refRate) / 100);
          }
      }

      if (method === PAYMENT_METHODS.CARD && payment.terminal) {
          const tempPayments = [{ ...payment, amount: amountToPay, method: PAYMENT_METHODS.CARD }];
          const expenses = prepareBankCommissions(tempPayments, terminals, branchId, new Date().toISOString());
          
          expenses.forEach(exp => {
              const expenseRef = doc(collection(db, COLLECTION_EXPENSES));
              transaction.set(expenseRef, exp);
          });
      }

      const newPayment = {
          id: crypto.randomUUID(),
          amount: amountToPay,
          method: method,
          paidAt: new Date().toISOString(),
          shiftId: shift.id,
          terminal: payment.terminal || null,
          cardType: payment.cardType || null,
          note: payment.note || "" 
      };

      const newPayments = [...(saleData.payments||[]), newPayment];
      const newPaidTotal = roundMoney(currentPaid + amountToPay);
      const newBalance = roundMoney(saleData.total - newPaidTotal);

      transaction.update(saleRef, {
          payments: newPayments,
          balance: newBalance,
          paidAmount: newPaidTotal,
          status: newBalance <= 0.01 ? "PAID" : "PENDING",
          pointsAwarded: (saleData.pointsAwarded || 0) + pointsToAward, 
          updatedAt: new Date().toISOString()
      });

      const netPointsChange = pointsToAward - pointsUsed;
      if (netPointsChange !== 0) {
          transaction.update(patientRef, { points: (Number(patientData.points) || 0) + netPointsChange });
      }

      if (referrerPoints > 0 && referrerSnap.exists()) {
          transaction.update(referrerRef, { points: (Number(referrerSnap.data().points) || 0) + referrerPoints });
      }

      logAuditAction({
          entityType: "SALE",
          entityId: saleId,
          action: AUDIT_ACTIONS.ADD_PAYMENT,
          user: user,
          reason: `Abono de $${amountToPay} (${method})`,
          previousState: { balance: saleData.balance, paid: saleData.paidAmount }
      }, transaction);

      recordLedgerEntry({
          saleId: saleId,
          amount: amountToPay,
          type: LEDGER_TYPES.PAYMENT,
          method: method,
          shiftId: shift.id,
          user: user,
          reference: `Abono Venta #${saleId.slice(0,6)}`,
          terminal: payment.terminal || null
      }, transaction);
  });
}

// 🟢 ELIMINAR PAGO INDIVIDUAL
export async function deletePaymentFromSale(saleId, paymentId) {
    const currentShift = await getCurrentShift();
    if (!currentShift) throw new Error("⛔ CAJA CERRADA: Necesitas turno abierto para corregir pagos.");
    const loyalty = await getLoyaltySettings();
    const user = currentShift.user || "Admin";

    await runTransaction(db, async (transaction) => {
        const saleRef = doc(db, COLLECTION_NAME, saleId);
        const saleSnap = await transaction.get(saleRef);
        if (!saleSnap.exists()) throw new Error("Venta no encontrada");

        const saleData = saleSnap.data();
        const paymentIndex = saleData.payments.findIndex(p => p.id === paymentId);
        
        if (paymentIndex === -1) throw new Error("Pago no encontrado");
        
        const paymentToDelete = saleData.payments[paymentIndex];
        
        if (paymentToDelete.method === PAYMENT_METHODS.POINTS) {
            const patientRef = doc(db, COLLECTION_PATIENTS, saleData.patientId);
            const patientSnap = await transaction.get(patientRef);
            if (patientSnap.exists()) {
                const currentPoints = patientSnap.data().points || 0;
                transaction.update(patientRef, { points: currentPoints + Number(paymentToDelete.amount) });
            }
        }

        let pointsToRevoke = 0;
        if (loyalty.enabled && paymentToDelete.method !== PAYMENT_METHODS.POINTS) {
            const rate = loyalty.earningRates[paymentToDelete.method] || loyalty.earningRates["GLOBAL"] || 0;
            pointsToRevoke = Math.floor((Number(paymentToDelete.amount) * rate) / 100);
            
            if (pointsToRevoke > 0) {
                const patientRef = doc(db, COLLECTION_PATIENTS, saleData.patientId);
                const pSnap = await transaction.get(patientRef);
                if (pSnap.exists()) {
                    transaction.update(patientRef, { points: (pSnap.data().points || 0) - pointsToRevoke });
                }
            }
        }

        const newPayments = saleData.payments.filter(p => p.id !== paymentId);
        const newPaidAmount = roundMoney(newPayments.reduce((sum, p) => sum + Number(p.amount), 0));
        const newBalance = roundMoney(saleData.total - newPaidAmount);

        transaction.update(saleRef, {
            payments: newPayments,
            paidAmount: newPaidAmount,
            balance: newBalance,
            status: newBalance <= 0.01 ? "PAID" : "PENDING",
            pointsAwarded: Math.max(0, (saleData.pointsAwarded || 0) - pointsToRevoke), 
            updatedAt: new Date().toISOString()
        });

        recordLedgerEntry({
            saleId: saleId,
            amount: -Math.abs(Number(paymentToDelete.amount)),
            type: LEDGER_TYPES.ADJUSTMENT,
            method: paymentToDelete.method,
            shiftId: currentShift.id,
            user: user,
            reference: `Corrección: Eliminación Pago ${paymentToDelete.id.slice(0,4)}`,
            terminal: paymentToDelete.terminal
        }, transaction);

        logAuditAction({
            entityType: "SALE",
            entityId: saleId,
            action: AUDIT_ACTIONS.DELETE_PAYMENT,
            user: user,
            reason: `Eliminación de pago ${paymentToDelete.amount} (${paymentToDelete.method})`,
            previousState: { paymentId: paymentId, amount: paymentToDelete.amount }
        }, transaction);
    });
}

// UPDATE LOGISTICS
export async function updateSaleLogistics(id, data) {
    const saleRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(saleRef, { soldBy: data.soldBy, updatedAt: new Date().toISOString() });
}

// --- DEVOLUCIONES (PROCESS RETURN) ---
export async function processReturn(saleId, itemId, qtyToReturn, refundMethod = "EFECTIVO", shouldRestock = true) {
    const currentShift = await getCurrentShift();
    if (!currentShift) throw new Error("⛔ CAJA CERRADA: Requieres turno para devoluciones.");
    const user = currentShift.user || "Admin";

    let stockError = null;

    try {
        await runTransaction(db, async (transaction) => {
            const saleRef = doc(db, COLLECTION_NAME, saleId);
            const saleSnap = await transaction.get(saleRef);
            if (!saleSnap.exists()) throw new Error("Venta no encontrada");
            
            const sale = saleSnap.data();
            let itemIndex = -1;
            if (itemId) itemIndex = sale.items.findIndex(i => i.id === itemId);
            if (itemIndex === -1) itemIndex = sale.items.findIndex(i => !i.id); 

            if (itemIndex === -1) throw new Error("No se pudo identificar el producto a devolver.");

            const item = sale.items[itemIndex];
            
            const originalSubtotal = sale.subtotalGross || sale.items.reduce((sum, i) => sum + ((i.qty + (i.returnedQty || 0)) * i.unitPrice), 0);
            const discountRatio = originalSubtotal > 0 ? (sale.discount / originalSubtotal) : 0;

            const grossRefund = item.unitPrice * qtyToReturn;
            const discountRecapture = grossRefund * discountRatio; 
            const netRefund = roundMoney(grossRefund - discountRecapture);

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

                if (refundMethod === PAYMENT_METHODS.POINTS) {
                    const patRef = doc(db, COLLECTION_PATIENTS, sale.patientId);
                    const patSnap = await transaction.get(patRef);
                    if (patSnap.exists()) {
                        transaction.update(patRef, { points: (patSnap.data().points || 0) + netRefund });
                    }
                }
            }

            const refundRatio = sale.total > 0 ? netRefund / sale.total : 0;
            const pointsToRevoke = Math.floor((sale.pointsAwarded || 0) * refundRatio);
            
            if (pointsToRevoke > 0) {
                const patRef = doc(db, COLLECTION_PATIENTS, sale.patientId);
                const patSnap = await transaction.get(patRef);
                if (patSnap.exists()) {
                     transaction.update(patRef, { points: Math.max(0, (patSnap.data().points || 0) - pointsToRevoke) });
                }
            }

            const updatedItems = [...sale.items];
            updatedItems[itemIndex] = {
                ...item,
                returnedQty: (item.returnedQty || 0) + qtyToReturn,
                qty: item.qty - qtyToReturn
            };

            const newSubtotal = roundMoney(updatedItems.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0));
            const newDiscount = roundMoney(Math.max(0, (sale.discount || 0) - discountRecapture));
            const newTotal = roundMoney(Math.max(0, newSubtotal - newDiscount));
            const newPaidAmount = roundMoney(newPayments.reduce((sum, p) => sum + (Number(p.amount)||0), 0));
            const newBalance = roundMoney(Math.max(0, newTotal - newPaidAmount));

            let newStatus = sale.status;
            if (newBalance <= 0.01) newStatus = newTotal === 0 ? "REFUNDED" : "PAID";

            transaction.update(saleRef, { 
                items: updatedItems, 
                subtotalGross: newSubtotal,
                discount: newDiscount,
                total: newTotal, 
                payments: newPayments,
                paidAmount: newPaidAmount,
                balance: newBalance,
                status: newStatus,
                pointsAwarded: Math.max(0, (sale.pointsAwarded || 0) - pointsToRevoke), 
                updatedAt: new Date().toISOString() 
            });

            if (netRefund > 0) {
                recordLedgerEntry({
                    saleId: saleId,
                    amount: -Math.abs(netRefund), 
                    type: LEDGER_TYPES.REFUND,
                    method: refundMethod,
                    shiftId: currentShift.id,
                    user: user,
                    reference: `Devolución: ${item.description.slice(0, 20)}...`,
                }, transaction);
            }

            logAuditAction({
                entityType: "SALE",
                entityId: saleId,
                action: AUDIT_ACTIONS.RETURN_ITEM,
                user: user,
                reason: `Devolución ${qtyToReturn}x ${item.description}`,
                previousState: { total: sale.total, status: sale.status }
            }, transaction);
        });

        if (shouldRestock && itemId) {
            const sCheck = await getSaleById(saleId);
            const freshItem = sCheck.items.find(i => i.id === itemId);
            if (freshItem && freshItem.inventoryProductId) {
                try {
                     await adjustStock(freshItem.inventoryProductId, qtyToReturn, `Devolución Venta #${saleId.slice(0,6)}`);
                } catch(e) {
                    console.error("Error stock:", e);
                    stockError = "Dinero devuelto, pero error en Stock: " + e.message;
                }
            }
        }
        
        const sCheck = await getSaleById(saleId);
        const freshItem = sCheck.items.find(i => (itemId ? i.id === itemId : true));
        if (freshItem && freshItem.requiresLab) {
             try { await cancelWorkOrderBySaleItem(saleId, freshItem.id); } catch(e){ console.error(e); }
        }

    } catch (e) {
        throw e;
    }

    return { stockError };
}

// 🟢 CANCELACIÓN TOTAL (SOFT DELETE REFACTORIZADO)
export async function deleteSale(id) {
    if (!id) return;
    
    const saleRef = doc(db, COLLECTION_NAME, id);
    const saleSnap = await getDoc(saleRef);
    if (!saleSnap.exists()) return; 
    
    const sale = saleSnap.data();
    if (sale.status === "CANCELLED") return;

    const woQuery = query(collection(db, COLLECTION_WORK_ORDERS), where("saleId", "==", id));
    const woSnap = await getDocs(woQuery);

    await runTransaction(db, async (transaction) => {
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

        const patientRef = doc(db, COLLECTION_PATIENTS, sale.patientId);
        const patientSnap = await transaction.get(patientRef);
        if (sale.pointsAwarded > 0 && patientSnap.exists()) {
            const currentPoints = Number(patientSnap.data().points) || 0;
            transaction.update(patientRef, { points: Math.max(0, currentPoints - sale.pointsAwarded) });
        }

        woSnap.docs.forEach(woDoc => { 
            transaction.update(woDoc.ref, { 
                status: WO_STATUS.CANCELLED,
                updatedAt: new Date().toISOString()
            }); 
        });

        transaction.update(saleRef, {
            status: "CANCELLED",
            balance: 0, 
            cancellationReason: "Anulación Administrativa",
            updatedAt: new Date().toISOString()
        });

        logAuditAction({
            entityType: "SALE",
            entityId: id,
            action: AUDIT_ACTIONS.VOID_SALE,
            user: "Admin",
            reason: "Cancelación completa de venta",
            previousState: { status: sale.status, total: sale.total }
        }, transaction);
    });
}

// 🟢 CORRECCIÓN MÉTODO DE PAGO (RECUPERADA Y BLINDADA)
export async function updateSalePaymentMethod(saleId, paymentId, newMethod) {
    const currentShift = await getCurrentShift();
    if (!currentShift) throw new Error("⛔ CAJA CERRADA: Necesitas turno para corregir métodos de pago.");
    const user = currentShift.user || "Admin";

    await runTransaction(db, async (transaction) => {
        const saleRef = doc(db, COLLECTION_NAME, saleId);
        const saleSnap = await transaction.get(saleRef);
        if (!saleSnap.exists()) throw new Error("Venta no encontrada");
        
        const saleData = saleSnap.data();
        const payment = saleData.payments.find(p => p.id === paymentId);
        if (!payment) throw new Error("Pago no encontrado");

        const oldMethod = payment.method;
        if (oldMethod === newMethod) return; // Sin cambios

        // Actualizar array
        const newPayments = saleData.payments.map(p => 
            p.id === paymentId ? { ...p, method: newMethod } : p
        );

        transaction.update(saleRef, { 
            payments: newPayments, 
            updatedAt: new Date().toISOString() 
        });

        // Auditoría
        logAuditAction({
            entityType: "SALE",
            entityId: saleId,
            action: AUDIT_ACTIONS.UPDATE_SALE,
            user: user,
            reason: `Corrección método pago: ${oldMethod} -> ${newMethod}`,
            previousState: { paymentId, oldMethod }
        }, transaction);

        // Ledger: Reclasificación contable (Salida del viejo, Entrada al nuevo)
        recordLedgerEntry({
            saleId: saleId,
            amount: -Math.abs(Number(payment.amount)),
            type: LEDGER_TYPES.ADJUSTMENT,
            method: oldMethod,
            shiftId: currentShift.id,
            user: user,
            reference: `Corrección (Salida): Cambio método pago`,
        }, transaction);

        recordLedgerEntry({
            saleId: saleId,
            amount: Math.abs(Number(payment.amount)),
            type: LEDGER_TYPES.ADJUSTMENT,
            method: newMethod,
            shiftId: currentShift.id,
            user: user,
            reference: `Corrección (Entrada): Cambio método pago`,
        }, transaction);
    });
    return true;
}