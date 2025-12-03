import { db } from "@/firebase/config";
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where 
} from "firebase/firestore";

const COLLECTION_NAME = "work_orders";
const STATUS_FLOW = ["ON_HOLD", "TO_PREPARE", "SENT_TO_LAB", "QUALITY_CHECK", "READY", "DELIVERED"];

// --- LECTURA ---
export async function getAllWorkOrders() {
  // Traemos las órdenes ordenadas por fecha de actualización para ver lo reciente arriba
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
    
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueDate: payload.dueDate || null,
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), newOrder);
  return { id: docRef.id, ...newOrder };
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

// Borrado en cascada (útil cuando borras una venta)
export async function deleteWorkOrdersBySaleId(saleId) {
  const q = query(collection(db, COLLECTION_NAME), where("saleId", "==", saleId));
  const snapshot = await getDocs(q);
  
  // Borramos una por una (Firestore no tiene "delete where" directo en cliente)
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

export async function applyWarranty(id, reason, extraCost) {
  const docRef = doc(db, COLLECTION_NAME, id);
  // Nota: En una app real primero leeríamos el doc para obtener el historial actual.
  // Aquí asumimos que el frontend nos pasa el historial o usamos arrayUnion (más avanzado).
  // Para la demo, haremos una actualización simple reiniciando el estado.
  
  await updateDoc(docRef, {
      status: "TO_PREPARE",
      isWarranty: true,
      updatedAt: new Date().toISOString()
      // En producción: agregaríamos el evento al warrantyHistory usando arrayUnion
  });
}

// Helpers síncronos para lógica de UI
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