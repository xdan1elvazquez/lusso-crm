const KEY = "lusso_labs_v1";

// Estructura base para un laboratorio nuevo
const EMPTY_LAB = {
  id: "",
  name: "",
  services: [], // Servicios simples (Bisel, Soldadura)
  lensCatalog: [] // 👈 NUEVO: Aquí vivirán las matrices complejas
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function write(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

export function getLabs() { return read(); }

export function createLab(data) {
  const list = read();
  const newLab = {
    ...EMPTY_LAB,
    id: crypto.randomUUID(),
    name: data.name,
    services: data.services || [],
    lensCatalog: data.lensCatalog || [] 
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