import { db } from "@/firebase/config";
import { 
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where 
} from "firebase/firestore";
import { normalizeRxValue } from "@/utils/rxOptions";

const COLLECTION_NAME = "eye_exams";

// Helper para limpiar la respuesta
function normalizeExamDoc(docSnapshot) {
    const data = docSnapshot.data();
    return {
        id: docSnapshot.id,
        ...data,
        // Aseguramos que Rx venga limpio para evitar errores en UI
        rx: normalizeRxValue(data.refraction?.finalRx || data.rx)
    };
}

export async function getExamsByPatient(patientId) {
  if (!patientId) return [];
  const q = query(collection(db, COLLECTION_NAME), where("patientId", "==", patientId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(normalizeExamDoc)
    .sort((a, b) => new Date(b.examDate) - new Date(a.examDate));
}

export async function getExamsByConsultation(consultationId) {
  if (!consultationId) return [];
  const q = query(collection(db, COLLECTION_NAME), where("consultationId", "==", consultationId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(normalizeExamDoc);
}

export async function getExamById(id) {
  if (!id) return null;
  // Implementación simplificada para demo
  return null; 
}

export async function createEyeExam(payload) {
  if (!payload.patientId) throw new Error("Patient ID requerido");
  
  const newExam = {
    patientId: payload.patientId,
    consultationId: payload.consultationId ?? null,
    examDate: payload.examDate || new Date().toISOString(),
    
    preliminary: payload.preliminary || {},
    refraction: payload.refraction || {},
    contactLens: payload.contactLens || {},
    recommendations: payload.recommendations || {},
    
    notes: payload.notes || "",
    // Guardamos una copia plana de rx para búsquedas rápidas
    rx: normalizeRxValue(payload.refraction?.finalRx || payload.rx), 
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), newExam);
  return { id: docRef.id, ...newExam };
}

export async function updateEyeExam(id, patch) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, patch);
}

export async function deleteEyeExam(id) {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}