const KEY = "lusso_patients_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function seedPatientsIfEmpty() {
  const list = read();
  if (list.length) return;

  const now = new Date().toISOString();
  write([
    {
      id: crypto.randomUUID(),
      firstName: "Cristian",
      lastName: "Demo",
      phone: "0000000000",
      email: "demo@lusso.mx",
      createdAt: now,
    },
  ]);
}

export function getPatients() {
  return read().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export function getPatientById(id) {
  return read().find((p) => p.id === id) || null;
}

export function createPatient(data) {
  const list = read();
  const patient = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    firstName: data.firstName?.trim() || "",
    lastName: data.lastName?.trim() || "",
    phone: data.phone?.trim() || "",
    email: data.email?.trim() || "",
  };
  const next = [patient, ...list];
  write(next);
  return patient;
}

export function updatePatient(id, data) {
  const list = read();
  const next = list.map((p) =>
    p.id === id
      ? {
          ...p,
          firstName: data.firstName?.trim() ?? p.firstName,
          lastName: data.lastName?.trim() ?? p.lastName,
          phone: data.phone?.trim() ?? p.phone,
          email: data.email?.trim() ?? p.email,
        }
      : p
  );
  write(next);
  return next.find((p) => p.id === id) || null;
}

export function deletePatient(id) {
  const list = read();
  const next = list.filter((p) => p.id !== id);
  write(next);
}
