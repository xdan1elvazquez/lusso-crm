import { db } from "@/firebase/config";
import { 
  collection, addDoc, getDocs, doc, updateDoc, query, where, orderBy 
} from "firebase/firestore";

const COLLECTION_NAME = "anamnesis";

export async function getAllAnamnesis() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(a => a.status !== "VOIDED");
}

export async function getAnamnesisByPatientId(patientId) {
  if (!patientId) return [];
  const q = query(collection(db, COLLECTION_NAME), where("patientId", "==", patientId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(a => a.status !== "VOIDED")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getLastAnamnesis(patientId) {
  const list = await getAnamnesisByPatientId(patientId);
  return list.length > 0 ? list[0] : null;
}

export async function createAnamnesis(payload) {
  const newEntry = {
    patientId: payload.patientId,
    createdAt: new Date().toISOString(),
    status: "ACTIVE",
    version: 1,
    systemic: payload.systemic || {},       
    nonPathological: payload.nonPathological || {}, 
    systemsReview: payload.systemsReview || {}, 
    ocular: payload.ocular || {},           
    family: payload.family || {},           
    allergies: payload.allergies || "",
    medications: payload.medications || "", 
    observations: payload.observations || ""
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), newEntry);
  return { id: docRef.id, ...newEntry };
}

export async function deleteAnamnesis(id) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { status: "VOIDED" });
}