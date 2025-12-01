import { createLog } from "./inventoryLogStorage"; // 👈 IMPORTAR EL LOGGER

const KEY = "lusso_inventory_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

export function getAllProducts() {
  return read().sort((a, b) => a.brand.localeCompare(b.brand));
}

export function getProductById(id) {
  return read().find((p) => p.id === id);
}

export function getInventoryStats() {
  const products = read();
  const frames = products.filter(p => p.category === "FRAMES");

  return {
    totalFrames: frames.length,
    byGender: {
      hombre: frames.filter(p => p.tags?.gender === "HOMBRE").length,
      mujer: frames.filter(p => p.tags?.gender === "MUJER").length,
      unisex: frames.filter(p => p.tags?.gender === "UNISEX").length,
      nino: frames.filter(p => p.tags?.gender === "NIÑO").length,
    },
    byMaterial: {
      metal: frames.filter(p => p.tags?.material === "METAL").length,
      acetato: frames.filter(p => p.tags?.material === "ACETATO").length,
      otro: frames.filter(p => !["METAL", "ACETATO"].includes(p.tags?.material)).length,
    },
    lowStock: products.filter(p => !p.isOnDemand && p.stock <= p.minStock).length,
    inventoryValue: products.reduce((sum, p) => sum + ((Number(p.cost)||0) * (Number(p.stock)||0)), 0)
  };
}

export function createProduct(data) {
  const list = read();
  const initialStock = data.isOnDemand ? 9999 : (Number(data.stock) || 0);
  
  const newProduct = {
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
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
  
  write([newProduct, ...list]);

  // 👈 LOG DE ENTRADA INICIAL
  if (!newProduct.isOnDemand) {
      createLog({
          productId: newProduct.id,
          type: "INITIAL",
          quantity: initialStock,
          finalStock: initialStock,
          reference: "Alta de Producto"
      });
  }

  return newProduct;
}

export function updateProduct(id, patch) {
  const list = read();
  const oldProduct = list.find(p => p.id === id); // Para comparar stock anterior
  
  const next = list.map((p) => {
    if (p.id !== id) return p;
    const newTags = { ...p.tags, ...(patch.tags || {}) };
    return { ...p, ...patch, tags: newTags };
  });
  
  write(next);

  // 👈 LOG DE AJUSTE MANUAL (Si cambió el stock desde el editor)
  const newProduct = next.find(p => p.id === id);
  if (oldProduct && !oldProduct.isOnDemand && patch.stock !== undefined) {
      const diff = Number(newProduct.stock) - Number(oldProduct.stock);
      if (diff !== 0) {
          createLog({
              productId: id,
              type: "ADJUSTMENT",
              quantity: diff,
              finalStock: newProduct.stock,
              reference: "Edición Manual"
          });
      }
  }

  return newProduct;
}

export function deleteProduct(id) {
  write(read().filter((p) => p.id !== id));
}

// 👈 ACTUALIZADO: Acepta "reason" para el log
export function adjustStock(id, amount, reason = "Movimiento") {
  const list = read();
  const product = list.find(p => p.id === id);
  
  if (!product) return false;
  if (product.isOnDemand) return true;

  const newStock = Number(product.stock) + Number(amount);
  
  // Guardamos el nuevo stock
  const next = list.map(p => p.id === id ? { ...p, stock: newStock } : p);
  write(next);

  // Generamos Log
  createLog({
      productId: id,
      type: amount < 0 ? "SALE" : "PURCHASE", // Inferimos tipo básico
      quantity: amount,
      finalStock: newStock,
      reference: reason
  });

  return true;
}