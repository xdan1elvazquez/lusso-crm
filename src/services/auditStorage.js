const KEY = "lusso_audit_trail_v1";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

export function logAuditAction({ entityType, entityId, action, version, previousState, reason, user }) {
  const list = read();
  const entry = {
    id: crypto.randomUUID(),
    entityType,
    entityId,
    action, // "CREATE", "UPDATE", "VOID"
    version,
    previousState: previousState ? JSON.stringify(previousState) : null, // Guardamos snapshot serializado
    reason: reason || "",
    user: user || "Usuario Actual", // En fase 2 conectamos con auth real
    timestamp: new Date().toISOString()
  };
  write([entry, ...list]); // Más recientes primero
}

export function getAuditHistory(entityId) {
  return read().filter(log => log.entityId === entityId);
}