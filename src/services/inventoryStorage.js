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

export function createProduct(data) {
  const list = read();
  const newProduct = {
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    category: data.category || "FRAMES", // FRAMES, CONTACT_LENS, ACCESSORY
    brand: data.brand?.trim() || "Genérico",
    model: data.model?.trim() || "",
    description: data.description?.trim() || "",
    price: Number(data.price) || 0, // Precio de Venta
    stock: Number(data.stock) || 0, // Cantidad actual
    minStock: Number(data.minStock) || 1, // Alerta de stock bajo
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
    updated = { ...p, ...patch };
    return updated;
  });
  write(next);
  return updated;
}

export function deleteProduct(id) {
  const list = read();
  write(list.filter((p) => p.id !== id));
}

// Función crítica para cuando vendas: Restar stock
export function adjustStock(id, amount) {
  const product = getProductById(id);
  if (!product) return false;
  const newStock = product.stock + amount; // amount puede ser negativo (venta) o positivo (compra)
  updateProduct(id, { stock: newStock });
  return true;
}