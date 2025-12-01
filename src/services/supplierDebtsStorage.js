const KEY = "lusso_supplier_debts_v1";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

export function getAllSupplierDebts() {
  return read().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function createSupplierDebt(data) {
  const list = read();
  const newDebt = {
    id: crypto.randomUUID(),
    provider: data.provider || "Proveedor General", // Ej. Marchon, Luxottica
    concept: data.concept || "Compra de Inventario",
    amount: Number(data.amount) || 0,
    category: data.category || "INVENTARIO", // INVENTARIO, OPERATIVO, OTRO
    isPaid: false,
    createdAt: new Date().toISOString(),
    dueDate: data.dueDate || null // Fecha límite de pago (opcional)
  };
  write([newDebt, ...list]);
  return newDebt;
}

export function markDebtAsPaid(id) {
  const list = read();
  const next = list.map(d => d.id === id ? { ...d, isPaid: true, paidAt: new Date().toISOString() } : d);
  write(next);
}

export function deleteSupplierDebt(id) {
  write(read().filter(d => d.id !== id));
}