import { db } from "@/firebase/config";
import { 
  collection, getDocs, setDoc, updateDoc, doc, getDoc, query, orderBy, where 
} from "firebase/firestore";

const COLLECTION_NAME = "employees";

export const ROLES = {
  ADMIN: "Administrador / Dueño",
  DOCTOR: "Optometrista / Dr.",
  SALES: "Vendedor / Recepción",
  LAB: "Técnico de Lab",
  COURIER: "Mensajería Interna",
  OTHER: "Limpieza / General"
};

export async function getEmployees() {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("deletedAt", "==", null),
    orderBy("name", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ✅ Función vital para que las reglas de seguridad te dejen entrar
export async function getEmployeeById(uid) {
  if (!uid) return null;
  const docRef = doc(db, COLLECTION_NAME, uid);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

export async function getEmployeeByEmail(email) {
  if (!email) return null;
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("email", "==", email),
    where("deletedAt", "==", null)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

// ✅ CORREGIDO: Recibe UID externo (para asegurar el link) y guarda TODOS tus datos
export async function createEmployee(uid, data) {
  const newEmp = {
    name: data.name,
    email: data.email?.trim().toLowerCase() || "",
    role: data.role || "OTHER",
    branchId: data.branchId || "lusso_main",
    commissionPercent: Number(data.commissionPercent) || 0,
    baseSalary: Number(data.baseSalary) || 0,
    permissions: data.permissions || null, 
    isActive: true,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    
    // 👇 RESTAURADO: Tu campo original
    hasAuthAccount: true 
  };
  
  // Usamos setDoc para forzar que el ID de Firestore sea igual al UID del Auth
  await setDoc(doc(db, COLLECTION_NAME, uid), newEmp);
  
  return { id: uid, ...newEmp };
}

export async function updateEmployee(id, patch) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, patch);
}

export async function deleteEmployee(id) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { deletedAt: new Date().toISOString() });
}