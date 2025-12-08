import { db } from "@/firebase/config";
import { collection, getDocs, writeBatch, query, orderBy } from "firebase/firestore";

/**
 * HERRAMIENTA DE REPARACIÓN FINANCIERA (V2 - Deep Clean)
 */

// 1. REPARAR SALDOS Y TOTALES
export async function repairSalesBalances() {
    const salesRef = collection(db, "sales");
    const snapshot = await getDocs(salesRef);
    const batch = writeBatch(db);
    let count = 0;
    const logs = [];

    snapshot.docs.forEach(docSnap => {
        const sale = docSnap.data();
        
        // A) RECALCULAR TOTAL REAL (Basado en items activos)
        // Esto arregla devoluciones previas que no actualizaron el total del ticket
        let realTotal = 0;
        if (Array.isArray(sale.items)) {
            const subtotal = sale.items.reduce((sum, item) => sum + ((item.qty || 0) * (item.unitPrice || 0)), 0);
            realTotal = Math.max(0, subtotal - (sale.discount || 0));
        } else {
            realTotal = Number(sale.total) || 0; // Fallback
        }

        // B) RECALCULAR PAGADO REAL
        const realPaid = (sale.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        
        // C) RECALCULAR SALDO
        const realBalance = Math.max(0, realTotal - realPaid);
        
        // D) ESTATUS
        let realStatus = sale.status;
        if (realBalance <= 0.01) {
            realStatus = realTotal === 0 ? "REFUNDED" : "PAID";
        } else {
            realStatus = "PENDING";
        }

        // E) DETECTAR INCONSISTENCIA
        const dbBalance = Number(sale.balance) || 0;
        const dbTotal = Number(sale.total) || 0;
        
        const balanceDiff = Math.abs(dbBalance - realBalance);
        const totalDiff = Math.abs(dbTotal - realTotal);

        if (balanceDiff > 0.01 || totalDiff > 0.01 || sale.status !== realStatus) {
            batch.update(docSnap.ref, {
                total: realTotal,
                balance: realBalance,
                paidAmount: realPaid,
                status: realStatus,
                updatedAt: new Date().toISOString()
            });
            count++;
            logs.push(`Corrección ${docSnap.id.slice(0,6)}: Total ${dbTotal}->${realTotal} | Saldo ${dbBalance}->${realBalance}`);
        }
    });

    if (count > 0) await batch.commit();
    return { count, logs };
}

// 2. ELIMINAR DUPLICADOS
export async function cleanDuplicateWorkOrders() {
    const woRef = collection(db, "work_orders");
    const q = query(woRef, orderBy("createdAt", "desc")); 
    const snapshot = await getDocs(q);
    
    const uniqueMap = new Map();
    const toDelete = [];
    const logs = [];

    snapshot.docs.forEach(docSnap => {
        const wo = docSnap.data();
        if (!wo.saleId || !wo.saleItemId) return;

        const key = `${wo.saleId}_${wo.saleItemId}`;

        if (uniqueMap.has(key)) {
            toDelete.push(docSnap.ref);
            logs.push(`Eliminando WO duplicada: ${docSnap.id}`);
        } else {
            uniqueMap.set(key, docSnap.id);
        }
    });

    const batch = writeBatch(db);
    let count = 0;
    toDelete.forEach(ref => {
        batch.delete(ref);
        count++;
    });

    if (count > 0) await batch.commit();
    return { count, logs };
}