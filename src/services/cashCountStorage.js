const KEY = "lusso_cash_counts_v1";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

export function getAllCuts() {
  return read().sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function createCut(data) {
  const list = read();
  
  // Estructura robusta para guardar el desglose
  const details = {
      cash: { 
          expected: Number(data.details?.cash?.expected) || 0, 
          declared: Number(data.details?.cash?.declared) || 0,
          diff: (Number(data.details?.cash?.declared) || 0) - (Number(data.details?.cash?.expected) || 0)
      },
      card: { 
          expected: Number(data.details?.card?.expected) || 0, 
          declared: Number(data.details?.card?.declared) || 0,
          diff: (Number(data.details?.card?.declared) || 0) - (Number(data.details?.card?.expected) || 0)
      },
      transfer: { 
          expected: Number(data.details?.transfer?.expected) || 0, 
          declared: Number(data.details?.transfer?.declared) || 0,
          diff: (Number(data.details?.transfer?.declared) || 0) - (Number(data.details?.transfer?.expected) || 0)
      }
  };

  const totalDifference = details.cash.diff + details.card.diff + details.transfer.diff;

  const newCut = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    details, // Guardamos el objeto completo
    totalDifference,
    notes: data.notes || "",
    user: "Admin"
  };
  
  write([newCut, ...list]);
  return newCut;
}

export function getLastCut() {
  const list = read();
  return list.length > 0 ? list[0] : null;
}