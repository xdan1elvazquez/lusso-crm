import { db } from "@/firebase/config";
import { 
  collection, addDoc, getDocs, doc, deleteDoc, query, where, orderBy 
} from "firebase/firestore";

const COLLECTION_NAME = "studies";

// --- LECTURA ---
export async function getStudiesByPatient(patientId) {
  if (!patientId) return [];
  const q = query(collection(db, COLLECTION_NAME), where("patientId", "==", patientId));
  const snapshot = await getDocs(q);
  // Ordenar en cliente
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getStudiesByConsultation(consultationId) {
  if (!consultationId) return [];
  const q = query(collection(db, COLLECTION_NAME), where("consultationId", "==", consultationId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- ESCRITURA ---
export async function createStudy(data) {
  const newStudy = {
    patientId: data.patientId,
    consultationId: data.consultationId || null,
    name: data.name, 
    type: data.type, // IMAGE, PDF, VIDEO, AUDIO
    url: data.url || "", 
    notes: data.notes || "",
    createdAt: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), newStudy);
  return { id: docRef.id, ...newStudy };
}

export async function deleteStudy(id) {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}