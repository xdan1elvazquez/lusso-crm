import { db } from "@/firebase/config";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs 
} from "firebase/firestore";

const COLLECTION_NAME = "inventory_logs";

// --- LECTURA ---
export async function getLogsByProductId(productId) {
  if (!productId) return [];
  
  const q = query(
    collection(db, COLLECTION_NAME),
    where("productId", "==", productId),
    orderBy("date", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- ESCRITURA ---
export async function createLog(data) {
  const newLog = {
    productId: data.productId,
    date: new Date().toISOString(),
    type: data.type || "ADJUSTMENT",
    quantity: Number(data.quantity) || 0,
    finalStock: Number(data.finalStock) || 0,
    reference: data.reference || "",
    user: data.user || "Admin" // Aquí conectarás el usuario real luego
  };

  await addDoc(collection(db, COLLECTION_NAME), newLog);
  return newLog;
}