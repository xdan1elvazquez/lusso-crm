const KEY = "lusso_employees_v1";

// Roles sugeridos para filtrar en los selectores
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

// Para llenar selectores específicos (ej. solo técnicos para "Quién talló")
export function getEmployeesByRole(roleKey) {
  if (!roleKey) return read();
  return read().filter(e => e.role === roleKey);
}

export function createEmployee(data) {
  const list = read();
  const newEmp = {
    id: crypto.randomUUID(),
    name: data.name,
    role: data.role || "OTHER",
    active: true,
    createdAt: new Date().toISOString()
  };
  write([...list, newEmp]);
  return newEmp;
}

export function deleteEmployee(id) {
  write(read().filter(e => e.id !== id));
}