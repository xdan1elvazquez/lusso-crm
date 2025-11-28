const KEY = "lusso_labs_v1";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

function write(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

export function getLabs() { return read(); }

export function createLab(data) {
  const list = read();
  const newLab = {
    id: crypto.randomUUID(),
    name: data.name,
    services: data.services || [] // Array de { id, name, price }
  };
  write([...list, newLab]);
  return newLab;
}

export function updateLab(id, patch) {
  const list = read();
  const next = list.map(l => l.id === id ? { ...l, ...patch } : l);
  write(next);
  return next.find(l => l.id === id);
}

export function deleteLab(id) {
  write(read().filter(l => l.id !== id));
}