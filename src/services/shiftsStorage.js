const KEY = "lusso_shifts_v1";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

export function getAllShifts() {
  return read().sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
}

export function getCurrentShift() {
  // Retorna el turno que esté ABIERTO (status: "OPEN")
  // En un sistema multi-usuario real, filtraríamos también por usuario.
  return read().find(s => s.status === "OPEN");
}

export function openShift(data) {
  const list = read();
  // Validar si ya hay uno abierto
  if (list.find(s => s.status === "OPEN")) throw new Error("Ya hay un turno abierto. Cierra el anterior primero.");
  
  const newShift = {
    id: crypto.randomUUID(),
    user: data.user || "General",
    initialCash: Number(data.initialCash) || 0, // Fondo de caja
    status: "OPEN",
    openedAt: new Date().toISOString(),
    closedAt: null,
    
    // Datos de cierre (se llenan al final)
    expected: null, 
    declared: null,
    difference: null,
    notes: ""
  };
  write([newShift, ...list]);
  return newShift;
}

export function closeShift(id, closeData) {
  const list = read();
  const next = list.map(s => {
    if (s.id !== id) return s;
    return {
      ...s,
      status: "CLOSED",
      closedAt: new Date().toISOString(),
      expected: closeData.expected, // { cash: 100, card: 200... }
      declared: closeData.declared, // { cash: 100, card: 200... }
      difference: closeData.difference, // { cash: 0, card: 0... }
      notes: closeData.notes || ""
    };
  });
  write(next);
}