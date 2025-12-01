const KEY = "lusso_inventory_logs_v1";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

export function getLogsByProductId(productId) {
  return read()
    .filter(log => log.productId === productId)
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // Más reciente primero
}

export function createLog(data) {
  const list = read();
  const newLog = {
    id: crypto.randomUUID(),
    productId: data.productId,
    date: new Date().toISOString(),
    type: data.type || "ADJUSTMENT", // SALE, PURCHASE, ADJUSTMENT, RETURN, INITIAL
    quantity: Number(data.quantity) || 0, // Puede ser negativo (salida) o positivo (entrada)
    finalStock: Number(data.finalStock) || 0, // Stock resultante después del movimiento
    reference: data.reference || "", // ID Venta, ID Compra, o "Manual"
    user: data.user || "Admin"
  };
  write([newLog, ...list]);
  return newLog;
}