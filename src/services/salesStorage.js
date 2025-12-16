import { db } from "@/firebase/config";
import { 
  collection, doc, runTransaction, getDocs, getDoc, updateDoc, deleteDoc, query, where, orderBy 
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
// 🟢 REFACTOR: Constantes
import { PAYMENT_METHODS, EXPENSE_CATEGORIES, WO_STATUS } from "@/utils/constants";

const COLLECTION_NAME = "sales";
const COLLECTION_PRODUCTS = "products";
const COLLECTION_PATIENTS = "patients";
const COLLECTION_LOGS = "inventory_logs";
const COLLECTION_EXPENSES = "expenses"; 

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

// --- CREACIÓN (ATÓMICA) ---
export async function createSale(payload, branchId = "lusso_main") {
  if (!payload?.patientId) throw new Error("patientId requerido");
  
  const currentShift = await getCurrentShift(branchId);
  if (!currentShift) throw new Error("⛔ CAJA CERRADA: No hay un turno abierto en esta sucursal.");
  
  const loyalty = await getLoyaltySettings(); 
  const terminals = await getTerminals(); 
  
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
    
    // 🟢 REFACTOR: Constante
    const pointsUsed = paymentsWithShift.filter(p => p.method === PAYMENT_METHODS.POINTS).reduce((sum, p) => sum + Number(p.amount), 0);
    if (pointsUsed > 0 && (patientData.points || 0) < pointsUsed) {
        throw new Error(`Saldo insuficiente de puntos.`);
    }

    const inventoryOps = prepareInventoryUpdates(sanitizedItems, productDataMap);
    const loyaltyResult = calculateLoyaltyPoints(paymentsWithShift, patientData, referrerData, loyalty);
    const bankExpenses = prepareBankCommissions(paymentsWithShift, terminals, branchId, now);

    const newSaleRef = doc(collection(db, COLLECTION_NAME));
    const workOrders = prepareWorkOrders(sanitizedItems, newSaleRef.id, branchId, payload.patientId, now, totalSale, paidAmount);

    // 3. ESCRITURAS
    const hasLabItems = sanitizedItems.some(i => i.requiresLab === true);
    const balance = Math.max(0, roundMoney(totalSale - paidAmount));
    
    const newSale = {
        branchId: branchId,
        patientId: payload.patientId,
        patientName: `${patientData.firstName} ${patientData.lastName}`.trim(),
        boxNumber: payload.boxNumber || "",
        soldBy: payload.soldBy || "",
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
        const woRef = doc(db, "work_orders", _id);
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

    const netPointsChange = loyaltyResult.pointsToAward - pointsUsed;
    if (netPointsChange !== 0) {
        transaction.update(patientRef, { points: (Number(patientData.points) || 0) + netPointsChange });
    }

    if (loyaltyResult.referrerPoints > 0 && referrerRef) {
        transaction.update(referrerRef, { points: (Number(referrerData.points) || 0) + loyaltyResult.referrerPoints });
    }

    return { id: newSaleRef.id, ...newSale };
  });

  return saleResult;
}

// --- MODIFICACIONES DE VENTA ---
export async function addPaymentToSale(saleId, payment) {
  const shift = await getCurrentShift(); 
  if (!shift) throw new Error("⛔ CAJA CERRADA: Abre un turno para abonos.");

  const loyalty = await getLoyaltySettings();
  const terminals = await getTerminals(); 
  const branchId = shift.branchId;

  await runTransaction(db, async (transaction) => {
      const saleRef = doc(db, COLLECTION_NAME, saleId);
      const saleSnap = await transaction.get(saleRef);
      if (!saleSnap.exists()) throw new Error("Venta no encontrada");
      
      const saleData = saleSnap.data();
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

      // 🟢 REFACTOR: Constante
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

      // Cálculo Comisiones Abono
      // 🟢 REFACTOR: Constante
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
  });
}

// 🟢 ELIMINAR PAGO INDIVIDUAL
export async function deletePaymentFromSale(saleId, paymentId) {
    const currentShift = await getCurrentShift();
    if (!currentShift) throw new Error("⛔ CAJA CERRADA: Necesitas turno abierto para corregir pagos.");
    const loyalty = await getLoyaltySettings();

    await runTransaction(db, async (transaction) => {
        const saleRef = doc(db, COLLECTION_NAME, saleId);
        const saleSnap = await transaction.get(saleRef);
        if (!saleSnap.exists()) throw new Error("Venta no encontrada");

        const saleData = saleSnap.data();
        const paymentIndex = saleData.payments.findIndex(p => p.id === paymentId);
        
        if (paymentIndex === -1) throw new Error("Pago no encontrado");
        
        const paymentToDelete = saleData.payments[paymentIndex];
        
        // 1. Revertir Puntos USADOS
        // 🟢 REFACTOR: Constante
        if (paymentToDelete.method === PAYMENT_METHODS.POINTS) {
            const patientRef = doc(db, COLLECTION_PATIENTS, saleData.patientId);
            const patientSnap = await transaction.get(patientRef);
            if (patientSnap.exists()) {
                const currentPoints = patientSnap.data().points || 0;
                transaction.update(patientRef, { points: currentPoints + Number(paymentToDelete.amount) });
            }
        }

        // 2. Revertir Puntos GANADOS
        let pointsToRevoke = 0;
        // 🟢 REFACTOR: Constante
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

        // 3. Recalcular
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
    });
}

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

        // 🟢 REFACTOR: Constante
        if (refundMethod === PAYMENT_METHODS.POINTS) {
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

    const newSubtotal = roundMoney(updatedItems.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0));
    const newDiscount = roundMoney(Math.max(0, (sale.discount || 0) - discountRecapture));
    const newTotal = roundMoney(Math.max(0, newSubtotal - newDiscount));
    const newPaidAmount = roundMoney(newPayments.reduce((sum, p) => sum + (Number(p.amount)||0), 0));
    const newBalance = roundMoney(Math.max(0, newTotal - newPaidAmount));

    let newStatus = sale.status;
    if (newBalance <= 0.01) newStatus = newTotal === 0 ? "REFUNDED" : "PAID";

    await updateDoc(saleRef, { 
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