import { db } from "@/firebase/config";
import { 
  collection, addDoc, getDocs, doc, updateDoc, query, where, orderBy 
} from "firebase/firestore";

const COLLECTION_NAME = "anamnesis";

// --- LECTURA ---

/**
 * Obtiene todo el historial de versiones para un paciente.
 * Ordenado: La más reciente (Vigente) primero.
 */
export async function getAnamnesisByPatientId(patientId) {
  if (!patientId) return [];
  const q = query(collection(db, COLLECTION_NAME), where("patientId", "==", patientId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(a => a.status !== "VOIDED")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Descendente
}

/**
 * Obtiene la versión vigente (snapshot más reciente).
 */
export async function getLastAnamnesis(patientId) {
  const list = await getAnamnesisByPatientId(patientId);
  return list.length > 0 ? list[0] : null;
}

// --- ESCRITURA ---

/**
 * CREAR NUEVA VERSIÓN (Snapshot / Actualización)
 * - Calcula la siguiente versión.
 * - Vincula con la anterior.
 * - Guarda un snapshot completo.
 */
export async function createAnamnesis(payload) {
  // 1. Buscar versión anterior para continuidad
  const last = await getLastAnamnesis(payload.patientId);
  
  // Lógica de versión: Si existe anterior sin versión, asumimos que era la 1, así que toca la 2.
  const previousVersionNumber = last?.version || (last ? 1 : 0);
  const nextVersion = previousVersionNumber + 1;

  const newEntry = {
    patientId: payload.patientId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "ACTIVE",
    version: nextVersion,
    
    // Metadatos de Versionado
    previousVersionId: last?.id || null,
    summary: payload.summary || "Actualización de expediente",
    createdBy: payload.createdBy || "Sistema", // En prod usar auth.currentUser

    // Snapshot de Datos Clínicos
    pathological: payload.pathological || {}, 
    nonPathological: payload.nonPathological || {}, 
    ocular: payload.ocular || {},           
    family: payload.family || {},           
    
    // Legacy mapping
    systemic: payload.systemic || {},
    observations: payload.observations || ""
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), newEntry);
  return { id: docRef.id, ...newEntry };
}

/**
 * ACTUALIZAR VERSIÓN VIGENTE (Corrección)
 * - Solo permitido si la versión no ha caducado por tiempo (lógica en UI).
 * - Actualiza el documento actual sin crear uno nuevo.
 */
export async function updateAnamnesis(id, payload) {
  const docRef = doc(db, COLLECTION_NAME, id);
  
  const updateData = {
    ...payload,
    updatedAt: new Date().toISOString()
  };

  // Protección de inmutabilidad de versión
  delete updateData.id;
  delete updateData.patientId;
  delete updateData.createdAt;
  delete updateData.version; 
  delete updateData.previousVersionId;

  await updateDoc(docRef, updateData);
  return { id, ...updateData };
}

/**
 * Soft Delete
 */
export async function deleteAnamnesis(id) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { status: "VOIDED" });
}