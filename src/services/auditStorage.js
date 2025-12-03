import { db } from "@/firebase/config";
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";

const COLLECTION_NAME = "audit_logs";

export async function logAuditAction({ entityType, entityId, action, version, previousState, reason, user }) {
  const entry = {
    entityType,
    entityId,
    action, // Ej: "CREATE", "UPDATE", "VOID", "UNLOCK"
    version: version || 1,
    // Convertimos el estado previo a string para guardarlo como 'snapshot' ligero
    previousState: previousState ? JSON.stringify(previousState) : null,
    reason: reason || "",
    user: user || "Desconocido", // Aquí idealmente conectarías el email del usuario actual
    timestamp: new Date().toISOString()
  };
  
  try {
      // "Fire and forget": No usamos await para no detener la interfaz del usuario
      // mientras se guarda el log en segundo plano.
      addDoc(collection(db, COLLECTION_NAME), entry);
  } catch (error) {
      console.error("Error guardando auditoría:", error);
  }
}

export async function getAuditHistory(entityId) {
  if (!entityId) return [];
  
  const q = query(
      collection(db, COLLECTION_NAME), 
      where("entityId", "==", entityId), 
      orderBy("timestamp", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}