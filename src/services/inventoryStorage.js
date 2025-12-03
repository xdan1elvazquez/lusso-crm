import { db } from "@/firebase/config";
import { 
  collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, orderBy 
} from "firebase/firestore";
import { createLog } from "./inventoryLogStorage";

const COLLECTION_NAME = "products";

// --- LECTURA ---
export async function getAllProducts() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("brand", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- ESCRITURA ---
export async function createProduct(data) {
  const initialStock = data.isOnDemand ? 9999 : (Number(data.stock) || 0);
  
  const newProduct = {
    category: data.category || "FRAMES",
    brand: data.brand?.trim() || "Genérico",
    model: data.model?.trim() || "",
    description: data.description?.trim() || "",
    
    price: Number(data.price) || 0,
    cost: Number(data.cost) || 0,
    
    isOnDemand: Boolean(data.isOnDemand), 
    stock: initialStock, 
    minStock: Number(data.minStock) || 1,
    
    taxable: data.taxable !== undefined ? Boolean(data.taxable) : true,
    batch: data.batch || "", 
    expiry: data.expiry || "", 
    
    tags: {
      gender: data.tags?.gender || "UNISEX", 
      material: data.tags?.material || "OTRO", 
      color: data.tags?.color || "",
      presentation: data.tags?.presentation || "OTHER"
    },
    
    createdAt: new Date().toISOString(),
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), newProduct);
  const productId = docRef.id;

  // Log inicial
  if (!newProduct.isOnDemand) {
      await createLog({
          productId,
          type: "INITIAL",
          quantity: initialStock,
          finalStock: initialStock,
          reference: "Alta de Producto"
      });
  }

  return { id: productId, ...newProduct };
}

export async function updateProduct(id, patch) {
  const docRef = doc(db, COLLECTION_NAME, id);
  // Nota: En una app real, aquí leeríamos el "oldProduct" para calcular diff de stock
  // Para la demo, confiamos en el patch.
  
  // Limpiamos id para no duplicarlo
  const cleanPatch = { ...patch };
  delete cleanPatch.id;

  await updateDoc(docRef, cleanPatch);
  
  // Si hubo cambio de stock manual, registramos log (Lógica simplificada)
  if (patch.stock !== undefined && !patch.isOnDemand) {
      await createLog({
          productId: id,
          type: "ADJUSTMENT",
          quantity: 0, // No calculamos diff aquí para simplificar la demo
          finalStock: Number(patch.stock),
          reference: "Edición Manual"
      });
  }
}

export async function deleteProduct(id) {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}

// Actualización de stock transaccional (Simplificada para Demo)
export async function adjustStock(id, amount, reason = "Movimiento", currentStockKnown = 0) {
  const docRef = doc(db, COLLECTION_NAME, id);
  const newStock = Number(currentStockKnown) + Number(amount);
  
  await updateDoc(docRef, { stock: newStock });

  await createLog({
      productId: id,
      type: amount < 0 ? "SALE" : "PURCHASE",
      quantity: amount,
      finalStock: newStock,
      reference: reason
  });
}

// --- UTILIDAD (Cálculo en cliente) ---
export function computeInventoryStats(products) {
  const frames = products.filter(p => p.category === "FRAMES");

  return {
    totalFrames: frames.length,
    byGender: {
      hombre: frames.filter(p => p.tags?.gender === "HOMBRE").length,
      mujer: frames.filter(p => p.tags?.gender === "MUJER").length,
      unisex: frames.filter(p => p.tags?.gender === "UNISEX").length,
      nino: frames.filter(p => p.tags?.gender === "NIÑO").length,
    },
    inventoryValue: products.reduce((sum, p) => sum + ((Number(p.cost)||0) * (Number(p.stock)||0)), 0)
  };
}