import { db } from "@/firebase/config";
import { 
  collection, doc, runTransaction, getDocs, getDoc, updateDoc, deleteDoc, query, where, orderBy, addDoc 
} from "firebase/firestore";
import { getLoyaltySettings } from "./settingsStorage"; 
import { getCurrentShift } from "./shiftsStorage"; 
import { createWorkOrder, deleteWorkOrdersBySaleId, cancelWorkOrderBySaleItem } from "./workOrdersStorage"; 
import { adjustStock } from "./inventoryStorage";
import { adjustPatientPoints, getPatientById } from "./patientsStorage"; 

const COLLECTION_NAME = "sales";
const COLLECTION_PRODUCTS = "products";
const COLLECTION_PATIENTS = "patients";
const COLLECTION_LOGS = "inventory_logs";

// --- LECTURA ---
export async function getAllSales() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
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
                    // Nota: Los pagos con "PUNTOS" no suman al efectivo en caja, pero sí a la venta.
                    // Si quieres que el corte de caja NO cuente puntos como dinero físico, 
                    // simplemente los ignoramos en 'totalIncome' si es necesario.
                    // Aquí los sumamos para saber cuánto se vendió, pero en el desglose se verá "PUNTOS".
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

export async function getFinancialReport(startDate, endDate) { 
    const q = query(collection(db, COLLECTION_NAME));
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

export async function getProfitabilityReport(startDate, endDate) { 
    const q = query(collection(db, COLLECTION_NAME), where("createdAt", ">=", startDate + "T00:00:00"), where("createdAt", "<=", endDate + "T23:59:59"));
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

// --- CREACIÓN ---
async function ensureWorkOrdersForSale(sale, saleId) {
    const total = Number(sale.total) || 0;
    const paid = Number(sale.paidAmount) || 0;
    const ratio = total > 0 ? paid / total : 1;
    const initialStatus = ratio >= 0.5 ? "TO_PREPARE" : "ON_HOLD";

    const lenses = sale.items.filter(i => i.kind === "LENSES");
    const frames = sale.items.filter(i => i.kind === "FRAMES");
    const contacts = sale.items.filter(i => i.kind === "CONTACT_LENS");
    let availableFrames = [...frames];

    for (const lens of lenses) {
        const linkedFrame = availableFrames.shift(); 
        const workOrderId = `wo_${saleId}_${lens.id}`; 
        
        await createWorkOrder({
            id: workOrderId, 
            patientId: sale.patientId,
            saleId: saleId,
            saleItemId: lens.id,
            type: "LENTES",
            status: initialStatus,
            labName: lens.labName || "",
            labCost: lens.cost || 0,
            rxNotes: lens.rxSnapshot ? JSON.stringify(lens.rxSnapshot) : "",
            frameCondition: linkedFrame ? `Nuevo: ${linkedFrame.description}` : "Propio/No especificado",
            dueDate: lens.dueDate || null,
            createdAt: sale.createdAt,
        });
    }

    for (const cl of contacts) {
        const workOrderId = `wo_${saleId}_${cl.id}`; 
        await createWorkOrder({
            id: workOrderId, 
            patientId: sale.patientId,
            saleId: saleId,
            saleItemId: cl.id,
            type: "LC",
            status: initialStatus,
            labName: "Lentes de Contacto",
            labCost: cl.cost || 0,
            rxNotes: cl.rxSnapshot ? JSON.stringify(cl.rxSnapshot) : "",
            dueDate: cl.dueDate || null,
            createdAt: sale.createdAt,
        });
    }
}

export async function createSale(payload) {
  if (!payload?.patientId) throw new Error("patientId requerido");
  const currentShift = await getCurrentShift();
  if (!currentShift) throw new Error("⛔ CAJA CERRADA: No hay un turno abierto.");
  const loyalty = await getLoyaltySettings(); 
  
  const saleResult = await runTransaction(db, async (transaction) => {
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

    const sanitizedItems = payload.items.map(i => ({
        ...i,
        id: i.id || crypto.randomUUID()
    }));

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
    
    // --- LÓGICA DE PUNTOS ---
    let pointsToAward = 0; // Puntos GANADOS
    let referrerPoints = 0;
    
    // Preparar pagos
    const paymentsWithShift = (payload.payments || []).map(p => ({ ...p, shiftId: currentShift.id }));
    const paidAmount = paymentsWithShift.reduce((sum, p) => sum + Number(p.amount), 0);
    
    // 🔴 1. DESCONTAR PUNTOS SI PAGÓ CON PUNTOS (VALIDACIÓN)
    const pointsUsed = paymentsWithShift
        .filter(p => p.method === "PUNTOS")
        .reduce((sum, p) => sum + Number(p.amount), 0);
        
    if (pointsUsed > 0) {
        if ((patientData.points || 0) < pointsUsed) {
            throw new Error(`Saldo insuficiente de puntos. Disponibles: ${patientData.points}, Requeridos: ${pointsUsed}`);
        }
        // Restar puntos inmediatamente (aunque aún no guardamos, calculamos el neto)
        // Nota: En Firestore update se hará al final.
    }

    // 🟢 2. CALCULAR PUNTOS GANADOS (Solo si NO pagó con puntos)
    if (loyalty.enabled) {
        paymentsWithShift.forEach(pay => {
            const amount = Number(pay.amount) || 0;
            if (amount <= 0) return;
            const method = pay.method || "EFECTIVO";
            
            // Regla: Pagar con PUNTOS no genera nuevos puntos (usualmente)
            if (method !== "PUNTOS") {
                const ownRate = loyalty.earningRates[method] !== undefined ? loyalty.earningRates[method] : loyalty.earningRates["GLOBAL"];
                pointsToAward += Math.floor((amount * ownRate) / 100);

                // Comisión Padrino
                if (referrerSnap && referrerSnap.exists()) {
                    const refRate = Number(loyalty.referralBonusPercent) || 0;
                    const pointsForRef = Math.floor((amount * refRate) / 100);
                    referrerPoints += pointsForRef;
                }
            }
        });
    }

    const newSaleRef = doc(collection(db, COLLECTION_NAME));
    const newSale = {
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

    transaction.set(newSaleRef, newSale);

    inventoryUpdates.forEach(update => {
        transaction.update(update.ref, { stock: update.newStock });
        const logRef = doc(collection(db, COLLECTION_LOGS));
        transaction.set(logRef, { productId: update.ref.id, type: "SALE", quantity: -update.qty, finalStock: update.newStock, reference: `Venta #${newSaleRef.id.slice(0,6)}`, date: now });
    });

    // ACTUALIZAR PUNTOS (Neto: Ganados - Gastados)
    const netPointsChange = pointsToAward - pointsUsed;
    if (netPointsChange !== 0) {
        transaction.update(patientRef, { points: (Number(patientData.points) || 0) + netPointsChange });
    }

    // Actualizar Padrino
    if (referrerPoints > 0 && referrerSnap.exists()) {
        transaction.update(referrerRef, { points: (Number(referrerSnap.data().points) || 0) + referrerPoints });
    }

    return { id: newSaleRef.id, ...newSale };
  });

  if (saleResult.saleType === "LAB") await ensureWorkOrdersForSale(saleResult, saleResult.id).catch(console.error);
  return saleResult;
}

// --- MODIFICACIÓN (ABONOS) ---
export async function addPaymentToSale(saleId, payment) {
  const currentShift = await getCurrentShift();
  if (!currentShift) throw new Error("⛔ CAJA CERRADA: Abre un turno para abonos.");

  // Usamos runTransaction para asegurar que no se descuenten puntos si alguien más modificó el paciente
  await runTransaction(db, async (transaction) => {
      const saleRef = doc(db, COLLECTION_NAME, saleId);
      const saleSnap = await transaction.get(saleRef);
      if (!saleSnap.exists()) throw new Error("Venta no encontrada");
      
      const saleData = saleSnap.data();
      const currentPaid = (saleData.payments || []).reduce((sum, p) => sum + (Number(p.amount)||0), 0);
      const balance = saleData.total - currentPaid;
      
      const amountToPay = Math.min(Number(payment.amount), balance);
      if (amountToPay <= 0) return; // Nada que pagar

      const method = payment.method || "EFECTIVO";

      // 🔴 1. VALIDAR PUNTOS (Si paga con puntos)
      let pointsUsed = 0;
      if (method === "PUNTOS") {
          const patientRef = doc(db, COLLECTION_PATIENTS, saleData.patientId);
          const patientSnap = await transaction.get(patientRef);
          if (!patientSnap.exists()) throw new Error("Paciente no encontrado para descontar puntos.");
          const pPoints = patientSnap.data().points || 0;
          
          if (pPoints < amountToPay) {
              throw new Error(`Saldo insuficiente de puntos. Tienes ${pPoints}, intentas usar ${amountToPay}.`);
          }
          pointsUsed = amountToPay;
          
          // Descontar puntos
          transaction.update(patientRef, { points: pPoints - pointsUsed });
      }

      // 🟢 2. CALCULAR PUNTOS GANADOS (Solo si no paga con puntos)
      let pointsToAdd = 0;
      const loyalty = await getLoyaltySettings();
      
      if (loyalty.enabled && method !== "PUNTOS") {
          const ownRate = loyalty.earningRates[method] !== undefined ? loyalty.earningRates[method] : loyalty.earningRates["GLOBAL"];
          pointsToAdd = Math.floor((amountToPay * ownRate) / 100);
          
          // Sumar puntos al paciente
          if (pointsToAdd > 0) {
             // Nota: Si ya leímos patientRef arriba lo reusamos, si no, hay que leerlo (o hacer update atómico)
             // Para simplificar en updateDoc (ya que transaction update requiere haber leído), usamos incrementHelper
             // Pero como estamos en transacción, lo ideal es leer.
             const patientRef = doc(db, COLLECTION_PATIENTS, saleData.patientId);
             // Si ya leimos arriba (caso PUNTOS) no entramos aquí, así que hay que leer
             const pSnap = await transaction.get(patientRef); 
             if(pSnap.exists()) {
                 transaction.update(patientRef, { points: (pSnap.data().points || 0) + pointsToAdd });
             }
          }

          // Puntos al Referente
          if (saleData.patientId) {
             const pSnap = await transaction.get(doc(db, COLLECTION_PATIENTS, saleData.patientId));
             if (pSnap.exists() && pSnap.data().referredBy) {
                 const refId = pSnap.data().referredBy;
                 const refRate = Number(loyalty.referralBonusPercent) || 0;
                 const refPoints = Math.floor((amountToPay * refRate) / 100);
                 if (refPoints > 0) {
                     const refRef = doc(db, COLLECTION_PATIENTS, refId);
                     const refSnap = await transaction.get(refRef);
                     if (refSnap.exists()) {
                         transaction.update(refRef, { points: (refSnap.data().points || 0) + refPoints });
                     }
                 }
             }
          }
      }

      const newPayment = {
          id: crypto.randomUUID(),
          amount: amountToPay,
          method: method,
          paidAt: new Date().toISOString(),
          shiftId: currentShift.id,
          terminal: payment.terminal || null,
          cardType: payment.cardType || null
      };

      const newPayments = [...(saleData.payments||[]), newPayment];
      const newBalance = saleData.total - (currentPaid + amountToPay);
      const totalPointsAwarded = (saleData.pointsAwarded || 0) + pointsToAdd;

      transaction.update(saleRef, {
          payments: newPayments,
          balance: newBalance,
          paidAmount: currentPaid + amountToPay,
          status: newBalance <= 0.01 ? "PAID" : "PENDING",
          pointsAwarded: totalPointsAwarded, 
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

// 🟢 DEVOLUCIÓN CONTROLADA 
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
    
    // 1. STOCK
    if (shouldRestock && item.inventoryProductId) {
        try {
            await adjustStock(item.inventoryProductId, qtyToReturn, `Devolución Venta #${saleId.slice(0,6)}`);
        } catch (e) {
            console.error("Error devolviendo stock:", e);
            stockError = e.message;
        }
    } else if (shouldRestock && !item.inventoryProductId) {
        stockError = "El ítem no tiene vínculo con inventario.";
    }

    // 2. DINERO
    const refundAmount = item.unitPrice * qtyToReturn;
    let newPayments = [...(sale.payments||[])];
    
    if (refundAmount > 0) {
        newPayments.push({
            id: crypto.randomUUID(),
            amount: -refundAmount, 
            method: refundMethod,
            paidAt: new Date().toISOString(),
            shiftId: currentShift.id,
            note: `Reembolso: ${item.description}`
        });

        // 🔴 REEMBOLSO DE PUNTOS (Si devolvemos dinero al cliente en Puntos)
        if (refundMethod === "PUNTOS") {
            try { await adjustPatientPoints(sale.patientId, refundAmount); } 
            catch(e) { console.error("Error devolviendo puntos al cliente", e); }
        }
    }

    // 3. WORK ORDER
    if (item.requiresLab) {
        try { await cancelWorkOrderBySaleItem(saleId, item.id || itemId); } catch(e){ console.error(e); }
    }

    // 4. RETIRAR PUNTOS GANADOS (CASTIGO)
    const currentTotal = sale.total || 1; 
    const refundRatio = refundAmount / currentTotal;
    const pointsToRevoke = Math.floor((sale.pointsAwarded || 0) * refundRatio);
    if (pointsToRevoke > 0) {
        try { await adjustPatientPoints(sale.patientId, -pointsToRevoke); } catch (e) { console.error(e); }
    }

    // 5. ACTUALIZAR VENTA
    const updatedItems = [...sale.items];
    updatedItems[itemIndex] = {
        ...item,
        returnedQty: (item.returnedQty || 0) + qtyToReturn,
        qty: item.qty - qtyToReturn
    };

    const newSubtotal = updatedItems.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
    const newTotal = Math.max(0, newSubtotal - (sale.discount || 0));
    const newPaidAmount = newPayments.reduce((sum, p) => sum + (Number(p.amount)||0), 0);
    const newBalance = Math.max(0, newTotal - newPaidAmount);

    let newStatus = sale.status;
    if (newBalance <= 0.01) newStatus = newTotal === 0 ? "REFUNDED" : "PAID";

    await updateDoc(saleRef, { 
        items: updatedItems, 
        total: newTotal, 
        payments: newPayments,
        paidAmount: newPaidAmount,
        balance: newBalance,
        status: newStatus,
        pointsAwarded: (sale.pointsAwarded || 0) - pointsToRevoke, 
        updatedAt: new Date().toISOString() 
    });

    return { stockError };
}

// ELIMINACIÓN FORZOSA
export async function deleteSale(id) {
    const saleRef = doc(db, COLLECTION_NAME, id);
    const saleSnap = await getDoc(saleRef);
    
    if (saleSnap.exists()) {
        const sale = saleSnap.data();
        if (sale.pointsAwarded > 0) {
            try { await adjustPatientPoints(sale.patientId, -sale.pointsAwarded); } 
            catch (e) { console.warn("Error borrando puntos:", e); }
        }
        for (const item of sale.items) {
            if (item.inventoryProductId && item.qty > 0) {
                try {
                    await adjustStock(item.inventoryProductId, item.qty, `Cancelación Venta #${id.slice(0,6)}`);
                } catch (err) {
                    console.warn(err);
                }
            }
        }
    }
    
    await deleteDoc(saleRef);
    try { await deleteWorkOrdersBySaleId(id); } catch(e) { console.warn(e); }
}