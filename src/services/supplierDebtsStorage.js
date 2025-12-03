import { db } from "@/firebase/config";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";

const COLLECTION_NAME = "supplier_debts";

export async function getAllSupplierDebts() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createSupplierDebt(data) {
  const newDebt = {
    provider: data.provider || "Proveedor General",
    concept: data.concept || "Compra",
    amount: Number(data.amount) || 0,
    category: data.category || "INVENTARIO",
    isPaid: false,
    createdAt: new Date().toISOString(),
    dueDate: data.dueDate || null
  };
  const docRef = await addDoc(collection(db, COLLECTION_NAME), newDebt);
  return { id: docRef.id, ...newDebt };
}

export async function markDebtAsPaid(id) {
  await updateDoc(doc(db, COLLECTION_NAME, id), { isPaid: true, paidAt: new Date().toISOString() });
}

export async function deleteSupplierDebt(id) {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}