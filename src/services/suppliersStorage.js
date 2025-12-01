const KEY = "lusso_suppliers_v1";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

export function getSuppliers() {
  return read().sort((a, b) => a.name.localeCompare(b.name));
}

export function createSupplier(data) {
  const list = read();
  const newSup = {
    id: crypto.randomUUID(),
    name: data.name, // Ej. Luxottica
    contactName: data.contactName || "", // Ej. Juan Pérez (Vendedor)
    phone: data.phone || "",
    email: data.email || "",
    creditDays: Number(data.creditDays) || 0, // Días de crédito
    createdAt: new Date().toISOString()
  };
  write([newSup, ...list]);
  return newSup;
}

export function updateSupplier(id, patch) {
  const list = read();
  const next = list.map(s => s.id === id ? { ...s, ...patch } : s);
  write(next);
}

export function deleteSupplier(id) {
  write(read().filter(s => s.id !== id));
}