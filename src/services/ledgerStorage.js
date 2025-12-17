import { db } from "@/firebase/config";
import { collection, doc, addDoc, query, where, orderBy, getDocs } from "firebase/firestore";
import { LEDGER_TYPES } from "@/utils/constants";
import { roundMoney } from "@/utils/currency";

const COLLECTION_NAME = "finance_ledger";

/**
 * Registra un movimiento financiero en el Libro Mayor (APPEND-ONLY).
 */
export async function recordLedgerEntry({ 
    saleId, 
    amount, 
    type, 
    method, 
    shiftId, 
    user, 
    reference = "",
    terminal = null 
}, transaction = null) {

    // Validaciones P0
    if (!saleId) throw new Error("Ledger: saleId es requerido");
    if (typeof amount !== 'number') throw new Error("Ledger: amount debe ser numérico");
    
    const record = {
        saleId,
        amount, // Puede ser negativo para devoluciones
        type: type || LEDGER_TYPES.ADJUSTMENT,
        method: method || "UNKNOWN",
        shiftId: shiftId || "NO_SHIFT",
        user: user || "System",
        reference,
        terminal,
        timestamp: new Date().toISOString()
    };

    if (transaction) {
        const newRef = doc(collection(db, COLLECTION_NAME));
        transaction.set(newRef, record);
        return newRef.id;
    } else {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), record);
        return docRef.id;
    }
}

// --- NUEVAS FUNCIONES DE LECTURA (PAQUETE 3) ---

/**
 * Obtiene movimientos financieros en un rango de fechas.
 * Útil para cortes de caja reales y conciliación.
 */
export async function getLedgerMovements(startDate, endDate, branchId = null) {
    // Nota: Firestore filtra primero por igualdad, luego rango. 
    // Si tienes branchId en ledger sería ideal, por ahora filtramos en memoria si es necesario
    // o asumimos que el ledger es global y se filtra luego.
    // Para simplificar P3, traemos por fecha y ordenamos.
    
    const startIso = startDate + "T00:00:00";
    const endIso = endDate + "T23:59:59";

    const q = query(
        collection(db, COLLECTION_NAME),
        where("timestamp", ">=", startIso),
        where("timestamp", "<=", endIso),
        orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(q);
    
    // Mapeamos y calculamos totales al vuelo
    const movements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return movements;
}

/**
 * Calcula estadísticas financieras basadas en el Ledger (DINERO REAL).
 * Diferente a Ventas, esto es lo que realmente entró/salió de la caja.
 */
export async function getLedgerStats(startDate, endDate) {
    const movements = await getLedgerMovements(startDate, endDate);
    
    let totalIn = 0;
    let totalOut = 0;
    const byMethod = {};
    const byType = {};

    movements.forEach(m => {
        const amt = Number(m.amount) || 0;
        const method = m.method || "OTRO";
        const type = m.type || "OTRO";

        if (amt >= 0) totalIn += amt;
        else totalOut += Math.abs(amt);

        // Agrupación por Método
        if (!byMethod[method]) byMethod[method] = 0;
        byMethod[method] += amt;

        // Agrupación por Tipo (Venta, Abono, Reembolso)
        if (!byType[type]) byType[type] = 0;
        byType[type] += amt;
    });

    return {
        totalNet: roundMoney(totalIn - totalOut),
        totalIn: roundMoney(totalIn),
        totalOut: roundMoney(totalOut),
        byMethod,
        byType,
        movements // Retornamos también el detalle para tablas
    };
}