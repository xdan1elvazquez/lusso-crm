import { db } from "@/firebase/config";
import { 
  collection, getDocs, doc, runTransaction, query, where, orderBy, getDoc, setDoc 
} from "firebase/firestore";
import { createLog } from "./inventoryLogStorage";

const COLLECTION_NAME = "products";
const STATS_DOC_REF = doc(db, "stats", "inventory"); // 👈 El Marcador Único

// --- LECTURA ---
export async function getAllProducts() {
  // Solo traemos productos activos
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("deletedAt", "==", null),
    orderBy("brand", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 🟢 NUEVO: Leer Estadísticas ya calculadas (1 sola lectura vs miles)
export async function getInventoryStats() {
    const snap = await getDoc(STATS_DOC_REF);
    if (snap.exists()) return snap.data();
    return { totalFrames: 0, inventoryValue: 0, byGender: { HOMBRE:0, MUJER:0, UNISEX:0, NIÑO:0 } };
}

// 🟢 NUEVO: Función de Mantenimiento para inicializar/corregir el marcador
export async function recalculateInventoryStats() {
    const all = await getAllProducts();
    const stats = {
        totalFrames: 0,
        inventoryValue: 0,
        byGender: { HOMBRE:0, MUJER:0, UNISEX:0, NIÑO:0 }
    };

    all.forEach(p => {
        // Solo contamos armazones para la métrica de piezas
        if (p.category === "FRAMES") {
            stats.totalFrames += Number(p.stock) || 0;
            const g = p.tags?.gender || "UNISEX";
            if (stats.byGender[g] !== undefined) stats.byGender[g] += Number(p.stock) || 0;
        }
        // El valor monetario incluye todo lo que tenga costo y stock
        if (!p.isOnDemand) {
            stats.inventoryValue += (Number(p.cost) || 0) * (Number(p.stock) || 0);
        }
    });

    await setDoc(STATS_DOC_REF, stats);
    return stats;
}

// --- ESCRITURA TRANSACCIONAL ---

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
    taxable: data.taxable !== undefined ? Boolean(data.taxable) : true,
    batch: data.batch || "", 
    expiry: data.expiry || "", 
    tags: {
      gender: data.tags?.gender || "UNISEX", 
      material: data.tags?.material || "OTRO", 
      color: data.tags?.color || "",
      presentation: data.tags?.presentation || "OTHER"
    },
    deletedAt: null,
    createdAt: new Date().toISOString(),
  };

  return await runTransaction(db, async (transaction) => {
      // 1. Leer Stats actuales
      const statsSnap = await transaction.get(STATS_DOC_REF);
      const stats = statsSnap.exists() ? statsSnap.data() : { totalFrames: 0, inventoryValue: 0, byGender: { HOMBRE:0, MUJER:0, UNISEX:0, NIÑO:0 } };

      // 2. Crear referencia de producto
      const newRef = doc(collection(db, COLLECTION_NAME));
      
      // 3. Escribir Producto
      transaction.set(newRef, newProduct);

      // 4. Actualizar Stats (Solo si no es OnDemand para valor, y si es Frames para conteo)
      if (!newProduct.isOnDemand) {
          stats.inventoryValue += (cost * initialStock);
          
          if (newProduct.category === "FRAMES") {
              stats.totalFrames += initialStock;
              const g = newProduct.tags.gender;
              if (stats.byGender[g] !== undefined) stats.byGender[g] += initialStock;
          }
          
          transaction.set(STATS_DOC_REF, stats);
      }

      // Log (opcional dentro de tx, o fuera)
      // Para simplificar logs complejos, los hacemos fuera o usamos una escritura batch si fuera crítico.
      // Aquí asumimos éxito y retornamos ID.
      return newRef.id;
  });
}

export async function updateProduct(id, patch) {
  return await runTransaction(db, async (transaction) => {
      const ref = doc(db, COLLECTION_NAME, id);
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error("Producto no encontrado");
      
      const oldData = snap.data();
      const newData = { ...oldData, ...patch };
      delete newData.id; // limpieza

      // Leer Stats
      const statsSnap = await transaction.get(STATS_DOC_REF);
      const stats = statsSnap.exists() ? statsSnap.data() : { totalFrames: 0, inventoryValue: 0, byGender: {} };

      // Calcular diferencias para Stats
      if (!oldData.isOnDemand) {
          const oldVal = (Number(oldData.cost)||0) * (Number(oldData.stock)||0);
          const newVal = (Number(newData.cost)||0) * (Number(newData.stock)||0);
          stats.inventoryValue = (stats.inventoryValue || 0) - oldVal + newVal;

          if (oldData.category === "FRAMES") {
              stats.totalFrames -= (Number(oldData.stock)||0);
              if (stats.byGender[oldData.tags?.gender] !== undefined) stats.byGender[oldData.tags.gender] -= (Number(oldData.stock)||0);
          }
          if (newData.category === "FRAMES") {
              stats.totalFrames += (Number(newData.stock)||0);
              if (stats.byGender[newData.tags?.gender] !== undefined) stats.byGender[newData.tags.gender] = (stats.byGender[newData.tags.gender]||0) + (Number(newData.stock)||0);
          }
      }

      transaction.update(ref, newData);
      transaction.set(STATS_DOC_REF, stats);
  });
}

export async function deleteProduct(id) {
  return await runTransaction(db, async (transaction) => {
      const ref = doc(db, COLLECTION_NAME, id);
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error("Producto no encontrado");
      const p = snap.data();

      // Soft Delete
      transaction.update(ref, { deletedAt: new Date().toISOString() });

      // Actualizar Stats (Restar todo lo que aportaba este producto)
      if (!p.isOnDemand) {
          const statsSnap = await transaction.get(STATS_DOC_REF);
          if (statsSnap.exists()) {
              const stats = statsSnap.data();
              const val = (Number(p.cost)||0) * (Number(p.stock)||0);
              stats.inventoryValue = Math.max(0, (stats.inventoryValue || 0) - val);

              if (p.category === "FRAMES") {
                  stats.totalFrames = Math.max(0, (stats.totalFrames || 0) - (Number(p.stock)||0));
                  const g = p.tags?.gender;
                  if (stats.byGender[g]) stats.byGender[g] = Math.max(0, stats.byGender[g] - (Number(p.stock)||0));
              }
              transaction.set(STATS_DOC_REF, stats);
          }
      }
  });
}

// Ajuste manual de stock
export async function adjustStock(id, amount, reason = "Movimiento") {
    return await runTransaction(db, async (transaction) => {
        const ref = doc(db, COLLECTION_NAME, id);
        const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error("Producto no encontrado");
        const p = snap.data();

        const newStock = (Number(p.stock) || 0) + Number(amount);
        
        transaction.update(ref, { stock: newStock });

        // Actualizar Stats
        if (!p.isOnDemand) {
            const statsSnap = await transaction.get(STATS_DOC_REF);
            if (statsSnap.exists()) {
                const stats = statsSnap.data();
                const valueChange = (Number(p.cost)||0) * Number(amount);
                stats.inventoryValue = (stats.inventoryValue || 0) + valueChange;

                if (p.category === "FRAMES") {
                    stats.totalFrames = (stats.totalFrames || 0) + Number(amount);
                    const g = p.tags?.gender;
                    if (stats.byGender[g] !== undefined) stats.byGender[g] += Number(amount);
                }
                transaction.set(STATS_DOC_REF, stats);
            }
        }

        // Log (creamos referencia nueva)
        const logRef = doc(collection(db, "inventory_logs"));
        transaction.set(logRef, {
            productId: id,
            type: amount < 0 ? "SALE" : "PURCHASE",
            quantity: amount,
            finalStock: newStock,
            reference: reason,
            date: new Date().toISOString()
        });
    });
}