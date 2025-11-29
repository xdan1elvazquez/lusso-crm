const KEY = "lusso_studies_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

export function getStudiesByPatient(patientId) {
  if (!patientId) return [];
  // Ordenamos por fecha, los más nuevos primero
  return read()
    .filter(s => s.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getStudiesByConsultation(consultationId) {
  if (!consultationId) return [];
  return read().filter(s => s.consultationId === consultationId);
}

export function createStudy(data) {
  const list = read();
  const newStudy = {
    id: crypto.randomUUID(),
    patientId: data.patientId,
    consultationId: data.consultationId || null, // Opcional (si se sube desde perfil general)
    name: data.name, // Nombre del archivo o estudio
    type: data.type, // IMAGE, PDF, VIDEO, AUDIO
    url: data.url || "", // En un sistema real aquí iría la URL de AWS/Firebase
    notes: data.notes || "",
    createdAt: new Date().toISOString()
  };
  write([newStudy, ...list]);
  return newStudy;
}

export function deleteStudy(id) {
  write(read().filter(s => s.id !== id));
}