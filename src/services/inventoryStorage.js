const KEY = "lusso_inventory_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getAllProducts() {
  return read().sort((a, b) => a.brand.localeCompare(b.brand));
}

export function getProductById(id) {
  return read().find((p) => p.id === id);
}

// --- NUEVO: ESTADÍSTICAS INTELIGENTES ---
export function getInventoryStats() {
  const products = read();
  const frames = products.filter(p => p.category === "FRAMES");

  // Contadores rápidos para toma de decisiones
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
    lowStock: products.filter(p => !p.isOnDemand && p.stock <= p.minStock).length
  };
}

export function createProduct(data) {
  const list = read();
  const newProduct = {
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    category: data.category || "FRAMES",
    brand: data.brand?.trim() || "Genérico",
    model: data.model?.trim() || "",
    description: data.description?.trim() || "",
    
    price: Number(data.price) || 0,
    
    // LÓGICA NUEVA:
    isOnDemand: Boolean(data.isOnDemand), // True para LC o Micas que se piden
    stock: data.isOnDemand ? 9999 : (Number(data.stock) || 0), // Stock infinito si es bajo pedido
    minStock: Number(data.minStock) || 1,
    
    // ATRIBUTOS PARA TU TOMA DE DECISIÓN:
    tags: {
      gender: data.tags?.gender || "UNISEX", // HOMBRE, MUJER, UNISEX
      material: data.tags?.material || "OTRO", // METAL, ACETATO
      color: data.tags?.color || "",
    },
    
    createdAt: new Date().toISOString(),
  };
  write([newProduct, ...list]);
  return newProduct;
}

export function updateProduct(id, patch) {
  const list = read();
  let updated = null;
  const next = list.map((p) => {
    if (p.id !== id) return p;
    // Mezclamos tags con cuidado para no borrar los existentes
    const newTags = { ...p.tags, ...(patch.tags || {}) };
    updated = { ...p, ...patch, tags: newTags };
    return updated;
  });
  write(next);
  return updated;
}

export function deleteProduct(id) {
  const list = read();
  write(list.filter((p) => p.id !== id));
}

export function adjustStock(id, amount) {
  const product = getProductById(id);
  if (!product) return false;
  
  // Si es producto bajo demanda (LC), no descontamos stock real, siempre hay "disponible"
  if (product.isOnDemand) return true;

  const newStock = product.stock + amount;
  updateProduct(id, { stock: newStock });
  return true;
}