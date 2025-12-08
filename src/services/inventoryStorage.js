import { db } from "@/firebase/config";
import { 
  collection, getDocs, doc, runTransaction, query, where, orderBy, getDoc, setDoc, addDoc, updateDoc // 👈 AQUI FALTABA updateDoc
} from "firebase/firestore";

const COLLECTION_NAME = "products";
const STATS_DOC_REF = doc(db, "stats", "inventory");

// --- LECTURA ---
export async function getAllProducts() {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("deletedAt", "==", null),
    orderBy("brand", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getInventoryStats() {
    const snap = await getDoc(STATS_DOC_REF);
    if (snap.exists()) return snap.data();
    return { totalFrames: 0, inventoryValue: 0, byGender: {} };
}

export async function recalculateInventoryStats() {
    const all = await getAllProducts();
    const stats = { totalFrames: 0, inventoryValue: 0, byGender: { HOMBRE:0, MUJER:0, UNISEX:0, NIÑO:0 } };

    all.forEach(p => {
        if (p.category === "FRAMES") {
            stats.totalFrames += Number(p.stock) || 0;
            const g = p.tags?.gender || "UNISEX";
            if (stats.byGender[g] !== undefined) stats.byGender[g] += Number(p.stock) || 0;
        }
        if (!p.isOnDemand) {
            stats.inventoryValue += (Number(p.cost) || 0) * (Number(p.stock) || 0);
        }
    });

    await setDoc(STATS_DOC_REF, stats);
    return stats;
}

// --- ESCRITURA ---
export async function createProduct(data) {
  const initialStock = data.isOnDemand ? 9999 : (Number(data.stock) || 0);
  const cost = Number(data.cost) || 0;
  
  const newProduct = {
    category: data.category || "FRAMES",
    brand: data.brand?.trim() || "Genérico",
    model: data.model?.trim() || "",
    description: data.description?.trim() || "",
    price: Number(data.price) || 0,
    cost: cost,
    isOnDemand: Boolean(data.isOnDemand), 
    stock: initialStock, 
    minStock: Number(data.minStock) || 1,
    taxable: Boolean(data.taxable),
    batch: data.batch || "", 
    expiry: data.expiry || "", 
    tags: data.tags || {},
    deletedAt: null,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), newProduct);
  
  // Actualizar Stats en segundo plano
  if (!newProduct.isOnDemand) recalculateInventoryStats();
  
  return { id: docRef.id, ...newProduct };
}

export async function updateProduct(id, patch) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, patch); // 👈 Ahora sí funcionará
  
  // Recalcular stats si se tocó stock o costo
  if (patch.stock !== undefined || patch.cost !== undefined) recalculateInventoryStats();
}

export async function deleteProduct(id) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { deletedAt: new Date().toISOString() }); // 👈 Y aquí también
  recalculateInventoryStats();
}

// FUNCIÓN CRÍTICA DE AJUSTE
export async function adjustStock(id, amount, reason = "Movimiento") {
    if (!id) throw new Error("ID de producto inválido para ajuste de stock");

    return await runTransaction(db, async (transaction) => {
        const ref = doc(db, COLLECTION_NAME, id);
        const snap = await transaction.get(ref);
        
        if (!snap.exists()) throw new Error(`Producto con ID ${id} no encontrado en inventario.`);
        const p = snap.data();

        // Si es sobre pedido, no ajustamos stock numérico real
        if (p.isOnDemand) return;

        const newStock = (Number(p.stock) || 0) + Number(amount);
        
        transaction.update(ref, { stock: newStock });

        // Log
        const logRef = doc(collection(db, "inventory_logs"));
        transaction.set(logRef, {
            productId: id,
            type: amount < 0 ? "SALE" : "RETURN/ADJUST",
            quantity: amount,
            finalStock: newStock,
            reference: reason,
            date: new Date().toISOString()
        });
    });
}