import { db } from "@/firebase/config";
import { 
  collection, getDocs, doc, runTransaction, query, where, orderBy, getDoc, setDoc, addDoc, updateDoc
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
        // Solo contamos stock físico para "FRAMES" u otros físicos, ignoramos SERVICIOS
        if (p.category === "FRAMES") {
            stats.totalFrames += Number(p.stock) || 0;
            const g = p.tags?.gender || "UNISEX";
            if (stats.byGender[g] !== undefined) stats.byGender[g] += Number(p.stock) || 0;
        }
        // Valor de inventario solo para productos físicos (no isOnDemand)
        if (!p.isOnDemand && p.category !== "SERVICE") {
            stats.inventoryValue += (Number(p.cost) || 0) * (Number(p.stock) || 0);
        }
    });

    await setDoc(STATS_DOC_REF, stats);
    return stats;
}

// --- ESCRITURA ---
export async function createProduct(data) {
  // Lógica especial para SERVICIOS
  const isService = data.category === "SERVICE";
  
  // Si es servicio, forzamos isOnDemand true y stock dummy alto
  const isOnDemand = isService ? true : Boolean(data.isOnDemand);
  const initialStock = isOnDemand ? 9999 : (Number(data.stock) || 0);
  const cost = Number(data.cost) || 0;
  
  const newProduct = {
    category: data.category || "FRAMES",
    brand: data.brand?.trim() || "Genérico",
    model: data.model?.trim() || "",
    description: data.description?.trim() || "",
    price: Number(data.price) || 0,
    cost: cost,
    isOnDemand: isOnDemand, 
    stock: initialStock, 
    minStock: Number(data.minStock) || 1,
    taxable: Boolean(data.taxable),
    batch: data.batch || "", 
    expiry: data.expiry || "", 
    tags: data.tags || {},
    
    // Nuevo campo opcional para servicios
    serviceProfile: isService ? (data.serviceProfile || {}) : null,

    deletedAt: null,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), newProduct);
  
  // Actualizar Stats en segundo plano (solo si afecta inventario físico)
  if (!newProduct.isOnDemand) recalculateInventoryStats();
  
  return { id: docRef.id, ...newProduct };
}

export async function updateProduct(id, patch) {
  const docRef = doc(db, COLLECTION_NAME, id);
  
  // Si estamos convirtiendo a servicio o editando uno, aseguramos reglas
  if (patch.category === "SERVICE") {
      patch.isOnDemand = true;
      patch.stock = 9999;
  }

  await updateDoc(docRef, patch);
  
  // Recalcular stats si se tocó stock o costo y NO es un servicio/onDemand
  if ((patch.stock !== undefined || patch.cost !== undefined) && !patch.isOnDemand) {
      recalculateInventoryStats();
  }
}

export async function deleteProduct(id) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { deletedAt: new Date().toISOString() });
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

        // Si es sobre pedido o SERVICIO, no ajustamos stock numérico real
        if (p.isOnDemand || p.category === "SERVICE") return;

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