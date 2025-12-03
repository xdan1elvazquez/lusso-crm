import { db } from "@/firebase/config";
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy 
} from "firebase/firestore";

const COLLECTION_NAME = "employees";

export const ROLES = {
  DOCTOR: "Optometrista / Dr.",
  SALES: "Vendedor / Recepción",
  LAB: "Técnico de Lab",
  COURIER: "Mensajería Interna",
  OTHER: "Limpieza / General"
};

// --- LECTURA ---
export async function getEmployees() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("name", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- ESCRITURA ---
export async function createEmployee(data) {
  const newEmp = {
    name: data.name,
    role: data.role || "OTHER",
    commissionPercent: Number(data.commissionPercent) || 0,
    baseSalary: Number(data.baseSalary) || 0,
    active: true,
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
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}