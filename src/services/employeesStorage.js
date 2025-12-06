import { db } from "@/firebase/config";
import { 
  collection, getDocs, addDoc, updateDoc, doc, query, orderBy, where 
} from "firebase/firestore";

const COLLECTION_NAME = "employees";

export const ROLES = {
  ADMIN: "Administrador / Dueño", // 👈 NUEVO ROL MAESTRO
  DOCTOR: "Optometrista / Dr.",
  SALES: "Vendedor / Recepción",
  LAB: "Técnico de Lab",
  COURIER: "Mensajería Interna",
  OTHER: "Limpieza / General"
};

// --- LECTURA ---
export async function getEmployees() {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("deletedAt", "==", null),
    orderBy("name", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 👇 NUEVA FUNCIÓN CRÍTICA PARA AUTH
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

// --- ESCRITURA ---
export async function createEmployee(data) {
  const newEmp = {
    name: data.name,
    email: data.email?.trim().toLowerCase() || "", // 👈 GUARDAR EMAIL
    role: data.role || "OTHER",
    commissionPercent: Number(data.commissionPercent) || 0,
    baseSalary: Number(data.baseSalary) || 0,
    active: true,
    deletedAt: null,
    createdAt: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, COLLECTION_NAME), newEmp);
  return { id: docRef.id, ...newEmp };
}

export async function updateEmployee(id, patch) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, patch);
}

export async function deleteEmployee(id) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { deletedAt: new Date().toISOString() });
}