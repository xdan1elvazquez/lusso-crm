const KEY = "lusso_shifts_v1";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

export function getAllShifts() {
  return read().sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
}

export function getCurrentShift() {
  // Solo retorna el turno si está totalmente ABIERTO.
  // Si está en PRE_CLOSE, para efectos de ventas, cuenta como cerrado/bloqueado.
  return read().find(s => s.status === "OPEN");
}

// Helper para obtener turno en proceso de cierre (para la pantalla de auditoría)
export function getShiftInProcess() {
    return read().find(s => s.status === "PRE_CLOSE");
}

export function openShift(data) {
  const list = read();
  // Validar si ya hay uno abierto o en pre-cierre
  if (list.find(s => s.status === "OPEN" || s.status === "PRE_CLOSE")) {
      throw new Error("Ya hay un turno activo o en proceso de cierre.");
  }
  
  const newShift = {
    id: crypto.randomUUID(),
    user: data.user || "General",
    initialCash: Number(data.initialCash) || 0,
    status: "OPEN",
    openedAt: new Date().toISOString(),
    closedAt: null,
    
    // Etapa 1: Pre-Cierre (Declarado por Cajero)
    declared: null, 
    
    // Etapa 2: Cierre Final (Calculado por Sistema)
    expected: null, 
    difference: null,
    notes: ""
  };
  write([newShift, ...list]);
  return newShift;
}

// NUEVO: Paso intermedio (Corte Ciego)
export function preCloseShift(id, declaredData) {
    const list = read();
    const next = list.map(s => {
        if (s.id !== id) return s;
        return {
            ...s,
            status: "PRE_CLOSE", // Cambia estado para bloquear ventas
            declared: {
                cash: Number(declaredData.cash) || 0,
                card: Number(declaredData.card) || 0,
                transfer: Number(declaredData.transfer) || 0
            }
        };
    });
    write(next);
}

// Modificado: Ahora recibe los cálculos finales del sistema para guardar
export function closeShift(id, closeData) {
  const list = read();
  const next = list.map(s => {
    if (s.id !== id) return s;
    return {
      ...s,
      status: "CLOSED",
      closedAt: new Date().toISOString(),
      
      // Aseguramos que se guarden ambos lados de la moneda
      expected: closeData.expected, 
      declared: s.declared || closeData.declared, // Usa lo que ya estaba o lo nuevo si aplica
      difference: closeData.difference,
      notes: closeData.notes || ""
    };
  });
  write(next);
}