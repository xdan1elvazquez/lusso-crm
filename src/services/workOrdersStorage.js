import { db } from "@/firebase/config";
import { 
  collection, getDocs, setDoc, updateDoc, deleteDoc, doc, query, orderBy, where, addDoc, arrayUnion 
} from "firebase/firestore";

const COLLECTION_NAME = "work_orders";
const STATUS_FLOW = ["ON_HOLD", "TO_PREPARE", "SENT_TO_LAB", "QUALITY_CHECK", "READY", "DELIVERED"];

// --- LECTURA ---
export async function getAllWorkOrders(branchId = "lusso_main") {
  const q = query(
      collection(db, COLLECTION_NAME), 
      where("branchId", "==", branchId),
      orderBy("updatedAt", "desc")
  );
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
    branchId: payload.branchId || "lusso_main",
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
    history: [], // Historial vacío inicial

    // Estado y Notificaciones
    rxNotes: payload.rxNotes || "",
    status: payload.status || "TO_PREPARE",
    lastNotificationAt: null, // 🟢 P-2: Nuevo campo para control de mensajes
    notificationCount: 0,     // 🟢 P-2: Contador de intentos
    
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueDate: payload.dueDate || null,
  };

  if (payload.id) {
      const docRef = doc(db, COLLECTION_NAME, payload.id);
      await setDoc(docRef, newOrder); 
      return { id: payload.id, ...newOrder };
  } else {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), newOrder);
      return { id: docRef.id, ...newOrder };
  }
}

// Actualización genérica con soporte de auditoría
export async function updateWorkOrder(id, patch, auditEntry = null) {
  const docRef = doc(db, COLLECTION_NAME, id);
  
  const updatePayload = { 
    ...patch, 
    updatedAt: new Date().toISOString() 
  };

  // Si hay evento de auditoría, lo agregamos al array 'history'
  if (auditEntry) {
      updatePayload.history = arrayUnion({
          ...auditEntry,
          timestamp: new Date().toISOString()
      });
  }

  await updateDoc(docRef, updatePayload);
}

// 🟢 P-2: Función helper para registrar notificaciones (Manuales o Automáticas)
export async function markAsNotified(id, method = "WHATSAPP", notes = "") {
    const docRef = doc(db, COLLECTION_NAME, id);
    const now = new Date().toISOString();
    
    await updateDoc(docRef, {
        lastNotificationAt: now,
        notificationCount: increment(1),
        history: arrayUnion({
            action: "NOTIFICACION_ENVIADA",
            details: `Vía ${method}. ${notes}`,
            timestamp: now,
            actor: "SYSTEM_OR_USER" 
        })
    });
}

// 🟢 P-2: Función para cambiar estado con registro explícito
export async function advanceOrderStatus(id, newStatus, userConfig = {}) {
    if (!STATUS_FLOW.includes(newStatus)) throw new Error("Estado inválido");
    
    await updateWorkOrder(id, { status: newStatus }, {
        action: "CAMBIO_ESTADO",
        details: `Cambio a ${newStatus}`,
        actor: userConfig.name || "Usuario",
        prevStatus: userConfig.prevStatus || "?"
    });
}

export async function deleteWorkOrder(id) {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}

export async function deleteWorkOrdersBySaleId(saleId) {
  const q = query(collection(db, COLLECTION_NAME), where("saleId", "==", saleId));
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

export async function cancelWorkOrderBySaleItem(saleId, saleItemId) {
    const q = query(
        collection(db, COLLECTION_NAME), 
        where("saleId", "==", saleId),
        where("saleItemId", "==", saleItemId)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
        const updates = snapshot.docs.map(d => updateDoc(d.ref, { 
            status: "CANCELLED", 
            updatedAt: new Date().toISOString(),
            notes: (d.data().notes || "") + " [Cancelado por Devolución]",
            history: arrayUnion({
                action: "CANCELACION_AUTO",
                details: "Cancelado por devolución de venta",
                timestamp: new Date().toISOString(),
                actor: "SYSTEM"
            })
        }));
        await Promise.all(updates);
    }
}

export async function applyWarranty(id, reason, extraCost) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
      status: "TO_PREPARE",
      isWarranty: true,
      updatedAt: new Date().toISOString(),
      history: arrayUnion({
          action: "GARANTIA_APLICADA",
          details: `Motivo: ${reason} (Costo extra: ${extraCost})`,
          timestamp: new Date().toISOString(),
          actor: "USER" 
      })
  });
}

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