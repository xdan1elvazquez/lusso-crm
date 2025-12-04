import { db } from "@/firebase/config";
// Quitamos 'orderBy' de los imports de Firestore para no usarlo en la query
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

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
    user: user || "Desconocido", 
    timestamp: new Date().toISOString()
  };
  
  try {
      await addDoc(collection(db, COLLECTION_NAME), entry);
  } catch (error) {
      console.error("Error guardando auditoría:", error);
  }
}

export async function getAuditHistory(entityId) {
  if (!entityId) return [];
  
  // 1. Quitamos el orderBy de la query de Firebase para evitar el error de "Missing Index"
  const q = query(
      collection(db, COLLECTION_NAME), 
      where("entityId", "==", entityId)
  );
  
  try {
      const snapshot = await getDocs(q);
      
      // 2. Ordenamos los resultados aquí en el cliente (JavaScript)
      // Es igual de rápido para listas pequeñas como un historial clínico
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Orden descendente (más reciente primero)
        
  } catch (error) {
      console.error("Error obteniendo historial:", error);
      return [];
  }
}