import { db } from "@/firebase/config";
import { 
  collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy, limit 
} from "firebase/firestore";

const COLLECTION_NAME = "shifts";

// --- LECTURA ---
export async function getAllShifts() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("openedAt", "desc"), limit(20));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getCurrentShift() {
  // Buscamos un turno que esté ABIERTO
  const q = query(collection(db, COLLECTION_NAME), where("status", "==", "OPEN"));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docData = snapshot.docs[0];
  return { id: docData.id, ...docData.data() };
}

export async function getShiftInProcess() {
  // Buscamos un turno en PRE-CIERRE (Arqueo)
  const q = query(collection(db, COLLECTION_NAME), where("status", "==", "PRE_CLOSE"));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docData = snapshot.docs[0];
  return { id: docData.id, ...docData.data() };
}

// --- ESCRITURA ---
export async function openShift(data) {
  // Validación de seguridad: no abrir si ya hay uno
  const active = await getCurrentShift();
  const closing = await getShiftInProcess();
  
  if (active || closing) {
      throw new Error("Ya hay un turno activo o en proceso de cierre.");
  }
  
  const newShift = {
    user: data.user || "General",
    initialCash: Number(data.initialCash) || 0,
    status: "OPEN",
    openedAt: new Date().toISOString(),
    closedAt: null,
    declared: null, 
    expected: null, 
    difference: null,
    notes: ""
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), newShift);
  return { id: docRef.id, ...newShift };
}

export async function preCloseShift(id, declaredData) {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
        status: "PRE_CLOSE",
        declared: {
            cash: Number(declaredData.cash) || 0,
            card: Number(declaredData.card) || 0,
            transfer: Number(declaredData.transfer) || 0
        }
    });
}

export async function closeShift(id, closeData) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
      status: "CLOSED",
      closedAt: new Date().toISOString(),
      expected: closeData.expected, 
      difference: closeData.difference,
      notes: closeData.notes || ""
  });
}