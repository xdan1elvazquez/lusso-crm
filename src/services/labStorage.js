import { db } from "@/firebase/config";
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from "firebase/firestore";

const COLLECTION_NAME = "labs";

// --- 1. LECTURA BLINDADA ---
export async function getLabs() {
  try {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy("name", "asc"));
        const snapshot = await getDocs(q);
        // 🟢 CORRECCIÓN: Ponemos "...doc.data()" PRIMERO y "id: doc.id" AL FINAL.
        // Esto asegura que el ID real de Firebase sobrescriba cualquier basura (null) que venga en la data.
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (indexError) {
        console.warn("⚠️ Falló consulta ordenada, usando compatibilidad...");
        const snapshot = await getDocs(collection(db, COLLECTION_NAME));
        const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
  } catch (error) {
    console.error("❌ Error crítico obteniendo laboratorios:", error);
    return []; 
  }
}

// --- 2. CREACIÓN SEGURA ---
export async function createLab(labData) {
  try {
    const cleanData = JSON.parse(JSON.stringify(labData));
    
    // 🟢 CORRECCIÓN: Eliminamos explícitamente el ID antes de guardar para no ensuciar el documento
    delete cleanData.id;

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...cleanData,
      createdAt: new Date().toISOString(),
      active: true
    });
    
    return { id: docRef.id, ...cleanData };
  } catch (error) {
    console.error("Error creando laboratorio:", error);
    throw error;
  }
}

// --- 3. ACTUALIZACIÓN ---
export async function updateLab(id, updatedData) {
  if (!id) throw new Error("ID de laboratorio requerido");
  
  try {
    const labRef = doc(db, COLLECTION_NAME, id);
    // Limpiamos también aquí por seguridad
    const cleanData = JSON.parse(JSON.stringify(updatedData));
    delete cleanData.id;

    await updateDoc(labRef, {
      ...cleanData,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error actualizando laboratorio:", error);
    throw error;
  }
}

// --- 4. ELIMINACIÓN ---
export async function deleteLab(id) {
  if (!id) throw new Error("ID requerido");
  
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return true;
  } catch (error) {
    console.error("Error eliminando laboratorio:", error);
    throw error;
  }
}