import { db } from "@/firebase/config";
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, where } from "firebase/firestore";

const COLLECTION_NAME = "suppliers";

export async function getSuppliers() {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("deletedAt", "==", null), // 👈 Filtro
    orderBy("name", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createSupplier(data) {
  const newSup = {
    name: data.name,
    contactName: data.contactName || "",
    phone: data.phone || "",
    email: data.email || "",
    creditDays: Number(data.creditDays) || 0,
    deletedAt: null, // 👈 Init
    createdAt: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, COLLECTION_NAME), newSup);
  return { id: docRef.id, ...newSup };
}

export async function updateSupplier(id, patch) {
  await updateDoc(doc(db, COLLECTION_NAME, id), patch);
}

// 🛡️ SOFT DELETE
export async function deleteSupplier(id) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { deletedAt: new Date().toISOString() });
}