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

const COLLECTION_NAME = "labs"; // Nombre de la colección en la nube

// --- 1. LECTURA (Obtener todos los laboratorios desde la Nube) ---
export async function getLabs() {
  try {
    // Pedimos los datos a Firebase ordenados por nombre
    const q = query(collection(db, COLLECTION_NAME), orderBy("name", "asc"));
    const snapshot = await getDocs(q);
    
    // Convertimos el formato extraño de Firebase a una lista normal
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error obteniendo laboratorios:", error);
    return [];
  }
}

// --- 2. CREACIÓN (Guardar en la Nube) ---
export async function createLab(labData) {
  try {
    // Limpiamos datos para evitar errores (undefined no le gusta a Firebase)
    const cleanData = JSON.parse(JSON.stringify(labData));
    
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

// --- 3. ACTUALIZACIÓN (Editar en la Nube) ---
export async function updateLab(id, updatedData) {
  if (!id) throw new Error("ID de laboratorio requerido");
  
  try {
    const labRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(labRef, {
      ...updatedData,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error actualizando laboratorio:", error);
    throw error;
  }
}

// --- 4. ELIMINACIÓN (Borrar de la Nube) ---
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