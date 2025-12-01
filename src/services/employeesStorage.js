const KEY = "lusso_employees_v1";

export const ROLES = {
  DOCTOR: "Optometrista / Dr.",
  SALES: "Vendedor / Recepción",
  LAB: "Técnico de Lab",
  COURIER: "Mensajería Interna",
  OTHER: "Limpieza / General"
};

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

export function getEmployees() {
  return read().sort((a, b) => a.name.localeCompare(b.name));
}

export function createEmployee(data) {
  const list = read();
  const newEmp = {
    id: crypto.randomUUID(),
    name: data.name,
    role: data.role || "OTHER",
    commissionPercent: Number(data.commissionPercent) || 0,
    baseSalary: Number(data.baseSalary) || 0, // 👈 NUEVO CAMPO
    active: true,
    createdAt: new Date().toISOString()
  };
  write([...list, newEmp]);
  return newEmp;
}

export function updateEmployee(id, patch) {
  const list = read();
  const next = list.map(e => e.id === id ? { ...e, ...patch } : e);
  write(next);
  return next.find(e => e.id === id);
}

export function deleteEmployee(id) {
  write(read().filter(e => e.id !== id));
}