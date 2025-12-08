import { db } from "@/firebase/config";
import { 
  collection, getDocs, setDoc, updateDoc, deleteDoc, doc, query, orderBy, where, getDoc 
} from "firebase/firestore";

const COLLECTION_NAME = "work_orders";
const STATUS_FLOW = ["ON_HOLD", "TO_PREPARE", "SENT_TO_LAB", "QUALITY_CHECK", "READY", "DELIVERED"];

// --- LECTURA ---
export async function getAllWorkOrders() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getWorkOrdersByPatientId(patientId) {
  const q = query(collection(db, COLLECTION_NAME), where("patientId", "==", patientId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- ESCRITURA ---

/**
 * Crea una orden de trabajo.
 * CAMBIO CRÍTICO: Soporta 'customId' para garantizar idempotencia (evitar duplicados).
 * Si se pasa un id en el payload, se usa setDoc en lugar de addDoc.
 */
export async function createWorkOrder(payload) {
  const newOrder = {
    patientId: payload.patientId ?? null,
    saleId: payload.saleId ?? null,
    saleItemId: payload.saleItemId ?? null,
    type: payload.type || "OTRO",
    
    // Costos y Lab
    labId: payload.labId || "",        
    labName: payload.labName || "",    
    labCost: Number(payload.labCost) || 0, 
    isPaid: Boolean(payload.isPaid),
    
    // Logística
    courier: payload.courier || "",
    receivedBy: payload.receivedBy || "",
    jobMadeBy: payload.jobMadeBy || "",
    talladoBy: payload.talladoBy || "",
    frameCondition: payload.frameCondition || "",

    // Garantías
    isWarranty: Boolean(payload.isWarranty),
    warrantyHistory: payload.warrantyHistory || [], 

    rxNotes: payload.rxNotes || "",
    status: payload.status || "TO_PREPARE",
    
    createdAt: payload.createdAt || new Date().toISOString(), // Usar fecha venta si existe
    updatedAt: new Date().toISOString(),
    dueDate: payload.dueDate || null,
  };

  // Lógica Anti-Duplicados:
  // Si nos mandan un ID específico (ej: wo_venta123_item456), lo usamos.
  if (payload.id) {
      const docRef = doc(db, COLLECTION_NAME, payload.id);
      await setDoc(docRef, newOrder); // setDoc sobrescribe si existe (idempotente)
      return { id: payload.id, ...newOrder };
  } else {
      // Comportamiento legado (addDoc genera ID aleatorio)
      const docRef = await addDoc(collection(db, COLLECTION_NAME), newOrder);
      return { id: docRef.id, ...newOrder };
  }
}

export async function updateWorkOrder(id, patch) {
  const docRef = doc(db, COLLECTION_NAME, id);
  const updatePayload = { 
    ...patch, 
    updatedAt: new Date().toISOString() 
  };
  await updateDoc(docRef, updatePayload);
}

export async function deleteWorkOrder(id) {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}

// Borrado en cascada
export async function deleteWorkOrdersBySaleId(saleId) {
  const q = query(collection(db, COLLECTION_NAME), where("saleId", "==", saleId));
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

// 🟢 NUEVA FUNCIÓN: Cancelar orden específica por item (para devoluciones)
export async function cancelWorkOrderBySaleItem(saleId, saleItemId) {
    const q = query(
        collection(db, COLLECTION_NAME), 
        where("saleId", "==", saleId),
        where("saleItemId", "==", saleItemId)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
        // Cancelamos todas las que coincidan (debería ser 1 por la nueva lógica, pero por seguridad iteramos)
        const updates = snapshot.docs.map(d => updateDoc(d.ref, { 
            status: "CANCELLED", 
            updatedAt: new Date().toISOString(),
            notes: (d.data().notes || "") + " [Cancelado por Devolución]"
        }));
        await Promise.all(updates);
    }
}

export async function applyWarranty(id, reason, extraCost) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
      status: "TO_PREPARE",
      isWarranty: true,
      updatedAt: new Date().toISOString()
  });
}

// Helpers
export function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1) return STATUS_FLOW[0];
  if (idx >= STATUS_FLOW.length - 1) return STATUS_FLOW[idx];
  return STATUS_FLOW[idx + 1];
}

export function prevStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx <= 0) return STATUS_FLOW[0];
  return STATUS_FLOW[idx - 1];
}