import { db } from "@/firebase/config";
import { collection, addDoc, getDocs, query, where, doc, orderBy, limit } from "firebase/firestore";

const COLLECTION_NAME = "audit_logs";

export async function logAuditAction({ entityType, entityId, action, version, previousState, reason, user }, transaction = null) {
  const entry = {
    entityType,
    entityId,
    action, 
    version: version || 1,
    previousState: previousState ? JSON.stringify(previousState) : null,
    reason: reason || "Sin motivo",
    user: user || "System", 
    timestamp: new Date().toISOString()
  };
  
  try {
    if (transaction) {
      const newRef = doc(collection(db, COLLECTION_NAME));
      transaction.set(newRef, entry);
    } else {
      await addDoc(collection(db, COLLECTION_NAME), entry);
    }
  } catch (error) {
    console.error("⚠️ Error guardando auditoría (no bloqueante):", error);
  }
}

export async function getAuditHistory(entityId) {
  if (!entityId) return [];
  const q = query(collection(db, COLLECTION_NAME), where("entityId", "==", entityId));
  try {
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
      console.error("Error obteniendo historial:", error);
      return [];
  }
}

// --- NUEVA FUNCIÓN (PAQUETE 3) ---
export async function getGlobalAuditLogs(limitCount = 50) {
    // Traer los últimos N eventos del sistema
    const q = query(
        collection(db, COLLECTION_NAME),
        orderBy("timestamp", "desc"),
        limit(limitCount)
    );
    
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error leyendo logs globales:", error);
        return [];
    }
}