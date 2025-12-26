import { db } from "@/firebase/config";
import { 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  where,
  increment,
  writeBatch,
  deleteField // 👈 IMPORTANTE: Agregamos deleteField para limpiar campos
} from "firebase/firestore";

const COLLECTION_NAME = "patients";

// 🟢 HELPER: Normalización de Teléfono (Preservado)
function cleanPhone(rawPhone) {
  if (!rawPhone) return "";
  const digits = String(rawPhone).replace(/\D/g, "");
  
  if (digits.length === 10) return `+521${digits}`; 
  if (digits.length === 12 && digits.startsWith("52")) return `+${digits.slice(0,2)}1${digits.slice(2)}`;
  if (digits.length === 13 && digits.startsWith("521")) return `+${digits}`;
  
  return digits || rawPhone;
}

// 🟢 HELPER: Generador de Código de Referido
function generateReferralCode(firstName, lastName) {
    const f = (firstName || "X").replace(/\s/g, "").toUpperCase().substring(0, 3);
    const l = (lastName || "X").replace(/\s/g, "").toUpperCase().substring(0, 2);
    const rand = Math.floor(100 + Math.random() * 900); // 3 dígitos
    return `${f}${l}${rand}`;
}

// --- PUNTOS ---
export async function setPatientPoints(id, newTotal) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { points: Number(newTotal) });
}

export async function adjustPatientPoints(id, amount) {
  if (!id) return;
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    points: increment(Number(amount))
  });
}

// --- LECTURA ---
export async function getPatients() {
  // Solo traemos los que NO están borrados (deletedAt == null)
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("deletedAt", "==", null), 
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getPatientById(id) {
  if (!id) return null;
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getPatientsRecommendedBy(patientId) {
  if (!patientId) return [];
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("referredBy", "==", patientId), 
    where("deletedAt", "==", null) 
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- ESCRITURA ---
export async function createPatient(data) {
  const now = new Date().toISOString();
  const finalPhone = cleanPhone(data.phone);

  const myReferralCode = data.referralCode || generateReferralCode(data.firstName, data.lastName);

  const newPatient = {
    firstName: data.firstName?.trim() || "", 
    lastName: data.lastName?.trim() || "",
    
    curp: data.curp?.trim().toUpperCase() || "", 
    phone: finalPhone, 
    rawPhone: data.phone?.trim() || "", 
    homePhone: data.homePhone?.trim() || "",
    email: data.email?.trim() || "",
    
    dob: data.dob || "", 
    assignedSex: data.assignedSex || "NO_ESPECIFICADO",
    genderExpression: data.genderExpression || "",
    maritalStatus: data.maritalStatus || "",
    religion: data.religion || "",
    reliability: data.reliability || "NO_VALORADA",
    occupation: data.occupation?.trim() || "",
    
    referralCode: myReferralCode, 
    marketingConsent: data.marketingConsent !== false, 
    nextRecallDate: null, 
    lastNpsScore: null,   
    
    referralSource: data.referralSource || "Otro", 
    referredBy: data.referredBy || null, 
    points: 0,
    
    deletedAt: null, 
    deletionStatus: "NONE", // Nuevo: Estatus inicial de eliminación
    createdAt: now,
    updatedAt: now,
    lastViewed: now,

    taxData: {
        rfc: data.taxData?.rfc || "",
        razonSocial: data.taxData?.razonSocial || "",
        regimen: data.taxData?.regimen || "",
        cp: data.taxData?.cp || "",
        emailFactura: data.taxData?.emailFactura || data.email || ""
    },
    address: {
        street: data.address?.street || "",
        externalNumber: data.address?.externalNumber || "",
        internalNumber: data.address?.internalNumber || "",
        suburb: data.address?.suburb || "",
        city: data.address?.city || "",
        state: data.address?.state || "",
        zip: data.address?.zip || ""
    }
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), newPatient);
  return { id: docRef.id, ...newPatient };
}

export async function updatePatient(id, data) {
  const docRef = doc(db, COLLECTION_NAME, id);
  const now = new Date().toISOString();
  
  const updatePayload = { ...data, updatedAt: now };
  
  if (updatePayload.phone) {
      updatePayload.rawPhone = updatePayload.phone; 
      updatePayload.phone = cleanPhone(updatePayload.phone); 
  }

  delete updatePayload.id; 

  await updateDoc(docRef, updatePayload);
  return { id, ...updatePayload };
}

export async function touchPatientView(id) {
  if (!id) return;
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { lastViewed: new Date().toISOString() });
}

// ⚠️ DEPRECATED: Usar requestDeletePatient o confirmDeletePatient
export async function deletePatient(id) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { deletedAt: new Date().toISOString() });
}

// --- 🛡️ SISTEMA AVANZADO DE ELIMINACIÓN (NUEVO) ---

/**
 * 1. SOLICITAR ELIMINACIÓN (Para usuarios normales)
 * No borra, solo marca la intención y el motivo.
 */
export const requestDeletePatient = async (id, reason, requestedBy) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            deletionStatus: "REQUESTED", // Bandera visual
            deletionReason: reason,
            deletionRequestedBy: requestedBy, 
            deletionRequestedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("Error solicitando eliminación:", error);
        throw error;
    }
};

/**
 * 2. RECHAZAR ELIMINACIÓN (Para Admin)
 * Limpia las banderas de solicitud y vuelve a la normalidad.
 */
export const rejectDeleteRequest = async (id) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            deletionStatus: "NONE",
            deletionReason: deleteField(), // Borra el campo de la BD
            deletionRequestedBy: deleteField(),
            deletionRequestedAt: deleteField()
        });
        return true;
    } catch (error) {
        console.error("Error rechazando eliminación:", error);
        throw error;
    }
};

/**
 * 3. ELIMINACIÓN REAL (Soft Delete - Solo Admin)
 * Desaparece al paciente de las vistas activas.
 */
export const confirmDeletePatient = async (id) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            deletedAt: new Date().toISOString(), // Soft Delete
            deletionStatus: "DELETED",
            active: false // Flag extra por seguridad
        });
        return true;
    } catch (error) {
        console.error("Error confirmando eliminación:", error);
        throw error;
    }
};

// --- UTILIDADES ---
export async function seedPatientsIfEmpty() {
  const patients = await getPatients();
  if (patients.length > 0) return;
  console.log("Sembrando paciente demo...");
  await createPatient({
      firstName: "Cristian", lastName: "Demo (Nube)", 
      phone: "5512345678", email: "demo@lusso.mx",
      dob: "1990-01-01", assignedSex: "HOMBRE", occupation: "Tester"
  });
  window.location.reload();
}

// 👇 NUEVO: FUNCIONES DE DETECCIÓN DE DUPLICADOS 👇

// 1. Helper para "limpiar" texto (quita acentos, mayúsculas y espacios extra)
export const normalizeString = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD") // Descompone caracteres (ej. é -> e + ´)
    .replace(/[\u0300-\u036f]/g, "") // Quita los acentos
    .trim();
};

/**
 * Busca posibles duplicados antes de crear un paciente.
 * Criterios: Teléfono exacto, Email exacto, o Nombre similar.
 */
export async function findPotentialDuplicates(newPatientData) {
  const duplicates = [];
  const patientsRef = collection(db, COLLECTION_NAME);

  // A. BÚSQUEDA POR TELÉFONO (Si existe y tiene longitud mínima)
  // Limpiamos el teléfono entrante para comparar peras con peras
  const phoneToSearch = cleanPhone(newPatientData.phone);
  
  if (phoneToSearch && phoneToSearch.length > 8) {
    const qPhone = query(patientsRef, where("phone", "==", phoneToSearch), where("deletedAt", "==", null));
    const snapPhone = await getDocs(qPhone);
    snapPhone.forEach(doc => {
      duplicates.push({ id: doc.id, ...doc.data(), matchType: "Teléfono idéntico" });
    });
  }

  // B. BÚSQUEDA POR EMAIL (Si existe)
  if (newPatientData.email) {
    const qEmail = query(patientsRef, where("email", "==", newPatientData.email), where("deletedAt", "==", null));
    const snapEmail = await getDocs(qEmail);
    snapEmail.forEach(doc => {
      // Evitar agregar el mismo si ya lo encontramos por teléfono
      if (!duplicates.find(d => d.id === doc.id)) {
        duplicates.push({ id: doc.id, ...doc.data(), matchType: "Email idéntico" });
      }
    });
  }

  // C. BÚSQUEDA POR NOMBRE (Aproximada)
  // Firestore no tiene "fuzzy search", así que buscamos coincidencia exacta del NOMBRE DE PILA 
  // y luego filtramos en JS el apellido normalizado.
  if (newPatientData.firstName && newPatientData.lastName) {
    // Normalizamos lo que el usuario escribió
    const inputLast = normalizeString(newPatientData.lastName);

    // Buscamos pacientes que tengan el mismo primer nombre (case sensitive en firestore)
    // Intentamos buscar tal cual lo escribió, y tal vez capitalizado si prefieres
    const qName = query(patientsRef, where("firstName", "==", newPatientData.firstName.trim()), where("deletedAt", "==", null)); 
    const snapName = await getDocs(qName);
    
    snapName.forEach(doc => {
        const p = doc.data();
        // Comparamos apellidos normalizados
        if (normalizeString(p.lastName) === inputLast && !duplicates.find(d => d.id === doc.id)) {
             duplicates.push({ id: doc.id, ...p, matchType: "Nombre muy similar" });
        }
    });
  }

  return duplicates;
}