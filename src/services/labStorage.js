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

// --- 1. LECTURA BLINDADA (Con Fallback de Seguridad) ---
export async function getLabs() {
  try {
    // INTENTO 1: Pedir ordenado desde la Nube (La forma ideal)
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy("name", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (indexError) {
        // ⚠️ SI FALLA (Porque falta el índice en Firebase):
        // No rompemos la app. Capturamos el error y usamos el Plan B.
        console.warn("⚠️ Aviso: Falló la consulta ordenada (falta índice). Usando modo compatibilidad...", indexError);
        
        // INTENTO 2: Pedir todo SIN ordenar (Esto SIEMPRE funciona)
        const snapshot = await getDocs(collection(db, COLLECTION_NAME));
        
        // Recuperamos los datos
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Y los ordenamos aquí mismo en la computadora (Javascript)
        // Así el usuario los ve ordenados aunque Firebase no lo haya hecho.
        return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
  } catch (error) {
    // Si falla hasta el Plan B (ej. sin internet), devolvemos vacío para no trabar la pantalla
    console.error("❌ Error crítico obteniendo laboratorios:", error);
    return []; 
  }
}

// --- 2. CREACIÓN (Guardar en la Nube) ---
export async function createLab(labData) {
  try {
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